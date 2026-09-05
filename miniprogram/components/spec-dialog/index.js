/**
 * spec-dialog —— 选规格弹窗（单选 / 多选 / 双拼 + 份数 + 备注）
 * 由菜单页引入；确认后通过 confirm 事件把购物车条目传出
 */
Component({
  properties: {
    dish: { type: Object, value: null },
    visible: { type: Boolean, value: false }
  },

  data: {
    // 规格选择：{ [groupId]: [optionId...] }
    selections: {},
    qty: 1,
    remark: '',
    unitPrice: 0,
    totalPrice: 0,
    // 视图用规格列表（每个 option 带 selected 标记，WXML 不能调用方法）
    viewSpecs: []
  },

  observers: {
    'visible, dish': function (visible, dish) {
      if (visible && dish) {
        this.init(dish);
        this.setTabBarHidden(true);
      } else if (!visible) {
        this.setTabBarHidden(false);
      }
    }
  },

  methods: {
    /** 隐藏/恢复自定义 tabBar（弹窗打开时隐藏，避免底部被挡） */
    setTabBarHidden(hidden) {
      const pages = getCurrentPages();
      const page = pages[pages.length - 1];
      if (page && typeof page.getTabBar === 'function') {
        const tabBar = page.getTabBar();
        if (tabBar) tabBar.setData({ hidden });
      }
    },

    /** 阻止冒泡占位 */
    noop() {},

    /** 打开时初始化选择状态：单选组默认选中"冰饮/冰"（饮品习惯） */
    init(dish) {
      const selections = {};
      (dish.specs || []).forEach(g => {
        selections[String(g.id)] = [];
      });
      (dish.specs || []).forEach(g => {
        const key = String(g.id);
        if (Number(g.type) === 1 && selections[key].length === 0) {
          // 规格组默认选堂食
          if (g.name === '规格') {
            const dineIn = (g.options || []).find(o => o.name === '堂食');
            if (dineIn) {
              selections[key].push(dineIn.id);
              return;
            }
          }
          // 饮品习惯默认选冰
          const ice = (g.options || []).find(o => o.name === '冰饮' || o.name === '冰');
          if (ice) selections[key].push(ice.id);
        }
      });
      this.setData({ selections, qty: 1, remark: '' });
      this.buildViewSpecs();
      this.recalc();
    },

    /** 构建视图用规格列表：给每个 option 打上 selected 标记（WXML 无法调用 js 方法） */
    buildViewSpecs() {
      const dish = this.data.dish;
      const selections = this.data.selections;
      if (!dish) { this.setData({ viewSpecs: [] }); return; }
      const viewSpecs = (dish.specs || []).map(g => ({
        ...g,
        options: (g.options || []).map(o => ({
          ...o,
          selected: (selections[String(g.id)] || []).indexOf(o.id) >= 0
        }))
      }));
      this.setData({ viewSpecs });
    },

    /** 重算单价与合计（菜品价 + 规格加价） */
    recalc() {
      const dish = this.data.dish;
      if (!dish) return;
      const unit = this.calcUnitPrice(dish, this.data.selections);
      const qty = Math.max(1, Number(this.data.qty) || 1);
      this.setData({
        unitPrice: unit,
        totalPrice: Math.round(unit * qty * 100) / 100
      });
    },

    /** 计算单价 = 菜品价 + 所选规格加价 */
    calcUnitPrice(dish, selections) {
      let price = Number(dish.price);
      if (!isFinite(price)) price = 0;
      (dish.specs || []).forEach(g => {
        const sel = selections[String(g.id)] || [];
        (g.options || []).forEach(o => {
          if (sel.indexOf(o.id) >= 0) {
            price += Number(o.priceDelta) || 0;
          }
        });
      });
      return Math.round(price * 100) / 100;
    },

    /** 点选/取消选项：单选互斥，多选/双拼受最多选择数限制 */
    toggleOpt(e) {
      const { gid, oid } = e.currentTarget.dataset;
      const dish = this.data.dish;
      const g = (dish.specs || []).find(x => String(x.id) === String(gid));
      if (!g) return;
      const key = String(gid);
      const sel = (this.data.selections[key] || []).slice();
      const idx = sel.indexOf(oid);
      if (idx >= 0) {
        sel.splice(idx, 1);
      } else if (Number(g.type) === 1) {
        sel.length = 0;
        sel.push(oid);
      } else {
        const max = Number(g.maxSelect) || 99;
        if (sel.length >= max) {
          wx.showToast({ title: '「' + g.name + '」最多选 ' + max + ' 项', icon: 'none' });
          return;
        }
        sel.push(oid);
      }
      const selections = this.data.selections;
      selections[key] = sel;
      this.setData({ selections });
      this.buildViewSpecs();
      this.recalc();
    },

    qtyInc() {
      this.setData({ qty: this.data.qty + 1 });
      this.recalc();
    },
    qtyDec() {
      if (this.data.qty > 1) {
        this.setData({ qty: this.data.qty - 1 });
        this.recalc();
      }
    },
    onRemarkInput(e) {
      this.setData({ remark: e.detail.value });
    },

    /** 生成规格文本：辣度:微辣；双拼:烧鸭+叉烧 */
    buildSpecText(dish, selections) {
      const parts = [];
      (dish.specs || []).forEach(g => {
        const sel = selections[String(g.id)] || [];
        if (!sel.length) return;
        const names = (g.options || [])
          .filter(o => sel.indexOf(o.id) >= 0)
          .map(o => o.name)
          .join('+');
        parts.push(g.name + ':' + names);
      });
      return parts.join('；');
    },

    collectOptionIds(selections) {
      const ids = [];
      Object.keys(selections).forEach(k => {
        (selections[k] || []).forEach(id => ids.push(id));
      });
      return ids;
    },

    /** 规格签名：选项ID排序拼接，用于购物车条目区分 */
    specKey(selections) {
      const ids = this.collectOptionIds(selections).sort((a, b) => a - b);
      return ids.join('-') || '0';
    },

    /** 确认选择，把购物车条目交给父页面 */
    confirm() {
      const dish = this.data.dish;
      if (!dish) return;
      const selections = this.data.selections;
      // 必选校验（双拼组可不强制）
      for (const g of (dish.specs || [])) {
        const sel = selections[String(g.id)] || [];
        if (Number(g.required) === 1 && Number(g.type) !== 3 && sel.length === 0) {
          wx.showToast({ title: '请选择「' + g.name + '」', icon: 'none' });
          return;
        }
      }
      const key = dish.id + ':' + this.specKey(selections);
      this.triggerEvent('confirm', {
        key,
        id: dish.id,
        name: dish.name,
        price: this.calcUnitPrice(dish, selections),
        qty: this.data.qty,
        specText: this.buildSpecText(dish, selections),
        specOptionIds: this.collectOptionIds(selections),
        remark: (this.data.remark || '').trim()
      });
    },

    cancel() {
      this.triggerEvent('close');
    },
    onMaskTap() {
      this.triggerEvent('close');
    }
  }
});
