// 顾客扫码点餐端主逻辑（选规格 + 双拼 + 弹窗内选份数）
const { createApp, ref, reactive, computed, onMounted } = Vue;

const CustomerApp = {
  setup() {
    // 门店/桌台信息
    const shopName = '我的小店';
    const tableId = CusApi.tableId;
    const tableNo = String(tableId).padStart(2, '0');

    // 页面切换：menu / cart / orders
    const page = ref('menu');

    // ===== 菜单数据 =====
    const categories = ref([]);
    const allDishes = ref([]);
    const activeCate = ref(null);
    const menuLoading = ref(false);
    // 购物车：key = dishId:specKey（同菜品不同规格视为不同条目）
    // value = {key, id, name, price, qty, specText, specOptionIds}
    const cart = reactive({});

    // 加载分类和菜品
    async function loadMenu() {
      menuLoading.value = true;
      try {
        const [cats, dishes] = await Promise.all([
          CusApi.listCategories(),
          CusApi.listDishes()
        ]);
        categories.value = cats;
        allDishes.value = dishes;
        if (cats.length > 0 && activeCate.value === null) {
          activeCate.value = cats[0].id;
        }
      } catch (e) {
        ElMsg('菜单加载失败：' + e.message, 'error');
      } finally {
        menuLoading.value = false;
      }
    }

    // 按分类过滤菜品
    const filteredDishes = computed(() => {
      if (activeCate.value === null) return allDishes.value;
      return allDishes.value.filter(d => d.categoryId === activeCate.value);
    });

    // ===== 购物车 =====
    const cartItems = computed(() => Object.values(cart));
    const cartCount = computed(() => cartItems.value.reduce((s, i) => s + i.qty, 0));
    const cartTotal = computed(() => cartItems.value.reduce((s, i) => s + i.price * i.qty, 0));

    // 某菜品的购物车条目 key 列表（一个菜可能因规格不同有多条）
    function dishCartKeys(dishId) {
      return Object.keys(cart).filter(k => k.startsWith(dishId + ':'));
    }
    // 某菜品在购物车中的总数量（菜单页展示）
    function cartQty(dishId) {
      return dishCartKeys(dishId).reduce((s, k) => s + cart[k].qty, 0);
    }

    // ===== 选规格弹窗 — 使用独立 ref 保证响应式可靠 =====
    const specVisible = ref(false);
    const specDish = ref(null);
    const specSelections = ref({});
    const specQty = ref(1);
    const specRemark = ref('');

    // 计算属性：弹窗内的单价
    const specUnitPrice = computed(() => {
      return calcUnitPrice(specDish.value, specSelections.value);
    });
    // 计算属性：弹窗内的合计
    const specTotalPrice = computed(() => {
      return specUnitPrice.value * Math.max(1, Number(specQty.value) || 1);
    });

    function openSpecDialog(d) {
      const selections = {};
      (d.specs || []).forEach(g => { selections[g.id] = []; });
      // 单选温度组默认选冰饮/冰（饮品默认冰饮）
      (d.specs || []).forEach(g => {
        if (g.type === 1 && selections[g.id] && selections[g.id].length === 0) {
          const ice = (g.options || []).find(o => o.name === '冰饮' || o.name === '冰');
          if (ice) selections[g.id].push(ice.id);
        }
      });
      // 默认份数与备注：若该菜在购物车只有一个条目（无规格），预填其数量与备注
      let qty = 1;
      let remark = '';
      const keys = dishCartKeys(d.id);
      if (keys.length === 1 && keys[0] === d.id + ':0') {
        qty = Math.max(1, Number(cart[keys[0]].qty) || 1);
        remark = cart[keys[0]].remark || '';
      }
      specDish.value = d;
      specSelections.value = selections;
      specQty.value = qty;
      specRemark.value = remark;
      specVisible.value = true;
    }

    function closeSpecDialog() {
      specVisible.value = false;
      specDish.value = null;
    }

    function specQtyInc() {
      specQty.value = Number(specQty.value) + 1;
    }
    function specQtyDec() {
      if (Number(specQty.value) > 1) {
        specQty.value = Number(specQty.value) - 1;
      }
    }

    function isOptSelected(g, opt) {
      return (specSelections.value[g.id] || []).includes(opt.id);
    }
    // 点选/取消选项：单选互斥，多选/双拼受最多选择数限制
    function toggleOpt(g, opt) {
      const sel = specSelections.value[g.id] || [];
      const idx = sel.indexOf(opt.id);
      if (idx >= 0) {
        sel.splice(idx, 1);
        return;
      }
      if (g.type === 1) { // 单选：替换
        sel.length = 0;
        sel.push(opt.id);
        return;
      }
      const max = g.maxSelect || 99;
      if (sel.length >= max) {
        ElMsg('「' + g.name + '」最多选 ' + max + ' 项', 'warning');
        return;
      }
      sel.push(opt.id);
    }
    // 计算单价 = 菜品价 + 所选规格加价
    function calcUnitPrice(d, selections) {
      if (!d) return 0;
      let price = Number(d.price);
      if (!isFinite(price)) price = 0;
      const selMap = selections || {};
      (d.specs || []).forEach(g => {
        const sel = selMap[g.id] || [];
        (g.options || []).forEach(o => {
          if (sel.includes(o.id)) {
            price += Number(o.priceDelta) || 0;
          }
        });
      });
      return Math.round(price * 100) / 100;
    }
    // 生成规格文本
    function buildSpecText(d, selections) {
      const parts = [];
      (d.specs || []).forEach(g => {
        const sel = selections[g.id] || [];
        if (!sel.length) return;
        const names = (g.options || []).filter(o => sel.includes(o.id)).map(o => o.name).join('+');
        parts.push(g.name + ':' + names);
      });
      return parts.join('；');
    }
    function collectOptionIds(selections) {
      const ids = [];
      Object.values(selections).forEach(arr => ids.push(...arr));
      return ids;
    }
    // 规格签名：选项ID排序拼接，用于购物车条目区分
    function specKey(selections) {
      const ids = collectOptionIds(selections).sort((a, b) => a - b);
      return ids.join('-') || '0';
    }
    // 确认选择并按份数加入购物车
    function confirmSpec() {
      const d = specDish.value;
      if (!d) return;
      for (const g of (d.specs || [])) {
        const sel = specSelections.value[g.id] || [];
        // 双拼组(type===3)不做必选校验，可自由选择
        if (g.required === 1 && g.type !== 3 && sel.length === 0) {
          ElMsg('请选择「' + g.name + '」', 'warning');
          return;
        }
      }
      const sels = specSelections.value;
      const key = d.id + ':' + specKey(sels);
      const unit = calcUnitPrice(d, sels);
      const text = buildSpecText(d, sels);
      const ids = collectOptionIds(sels);
      const rmk = (specRemark.value || '').trim();
      if (cart[key]) {
        cart[key].qty += specQty.value;
        // 本次填写了备注则覆盖更新
        if (rmk) cart[key].remark = rmk;
      } else {
        cart[key] = { key, id: d.id, name: d.name, price: unit, qty: specQty.value, specText: text, specOptionIds: ids, remark: rmk };
      }
      specVisible.value = false;
    }
    // 购物车页：按条目调整数量
    function cartInc(item) {
      if (cart[item.key]) cart[item.key].qty++;
    }
    function cartDec(item) {
      if (!cart[item.key]) return;
      cart[item.key].qty--;
      if (cart[item.key].qty <= 0) delete cart[item.key];
    }

    // ===== 下单 =====
    const submitting = ref(false);
    const orderSuccess = reactive({ show: false, orderNo: '' });

    async function submitOrder() {
      if (cartCount.value === 0) { ElMsg('购物车为空', 'warning'); return; }
      submitting.value = true;
      try {
        const data = await CusApi.createOrder(cartItems.value);
        orderSuccess.orderNo = data.orderNo || '';
        orderSuccess.show = true;
        // 清空购物车
        Object.keys(cart).forEach(k => delete cart[k]);
      } catch (e) {
        ElMsg('下单失败：' + e.message, 'error');
      } finally {
        submitting.value = false;
      }
    }
    function afterOrderSuccess() {
      orderSuccess.show = false;
      page.value = 'orders';
      loadOrders();
    }

    // ===== 我的订单 =====
    const myOrders = ref([]);
    const ordersLoading = ref(false);
    // 简化：下单成功即显示"下单成功"（后厨与商家后台合二为一，无需复杂状态流转）
    const statusText = () => '下单成功';
    async function loadOrders() {
      ordersLoading.value = true;
      try {
        myOrders.value = await CusApi.listOrders();
      } catch (e) {
        ElMsg('订单加载失败：' + e.message, 'error');
      } finally {
        ordersLoading.value = false;
      }
    }
    function fmtTime(t) {
      if (!t) return '';
      return String(t).replace('T', ' ').substring(0, 16);
    }

    // ===== 订单详情弹窗（点击订单查看自己点了什么） =====
    const orderDetail = reactive({ visible: false, order: null, items: [] });
    function viewOrderDetail(o) {
      orderDetail.order = o;
      orderDetail.items = (o.items || []).slice();
      orderDetail.visible = true;
    }

    function switchPage(p) {
      page.value = p;
      if (p === 'orders') loadOrders();
    }

    onMounted(() => {
      loadMenu();
    });

    return {
      shopName, tableNo, page,
      categories, allDishes, activeCate, menuLoading, filteredDishes,
      cartItems, cartCount, cartTotal, cartQty, cartInc, cartDec,
      // 选规格弹窗
      specVisible, specDish, specSelections, specQty, specRemark,
      specUnitPrice, specTotalPrice,
      openSpecDialog, closeSpecDialog, specQtyInc, specQtyDec,
      isOptSelected, toggleOpt, calcUnitPrice, confirmSpec,
      submitting, submitOrder, orderSuccess, afterOrderSuccess,
      myOrders, ordersLoading, statusText, fmtTime, loadOrders, switchPage,
      orderDetail, viewOrderDetail
    };
  }
};

// Element Plus 的轻量消息（仅用于 toast，不引入完整组件库）
function ElMsg(text, type) {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:#fff;padding:10px 20px;border-radius:20px;font-size:14px;z-index:999;max-width:80%;';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2200);
}

Vue.createApp(CustomerApp).mount('#app');
