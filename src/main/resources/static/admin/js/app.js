// 商家管理后台主逻辑（Vue 3 组合式 + Element Plus）
const { createApp, ref, reactive, computed, watch, onMounted, nextTick } = Vue;

const App = {
  setup() {
    const app = Vue.createApp || createApp;
    // 当前选中菜单
    const current = ref('dish');
    const menus = [
      { key: 'dish', name: '菜品管理', icon: '🍽️' },
      { key: 'category', name: '分类管理', icon: '📂' },
      { key: 'table', name: '桌台管理', icon: '🪑' },
      { key: 'order', name: '订单管理', icon: '📋' },
      { key: 'cashier', name: '收银统计', icon: '💰' }
    ];
    const currentTitle = computed(() => {
      const m = menus.find(x => x.key === current.value);
      return m ? m.name : '';
    });

    const shopId = Api.SHOP_ID;

    // ========== 通用加载状态与消息 ==========
    const toast = (msg, type) => {
      ElementPlus.ElMessage({ message: msg, type: type || 'success' });
    };
    const errToast = (e) => {
      console.error(e);
      ElementPlus.ElMessage.error('操作失败：' + (e.message || e));
    };

    // ========== 菜品管理 ==========
    const dishes = ref([]);
    const categories = ref([]);
    const dishLoading = ref(false);
    const cateLoading = ref(false);
    const dishFilterCate = ref(null);
    const dishKeyword = ref('');

    async function loadDishes() {
      dishLoading.value = true;
      try {
        dishes.value = await Api.listDishes();
      } catch (e) { errToast(e); } finally { dishLoading.value = false; }
    }
    async function loadCategories() {
      cateLoading.value = true;
      try {
        categories.value = await Api.listCategories();
      } catch (e) { errToast(e); } finally { cateLoading.value = false; }
    }
    const filteredDishes = computed(() => {
      let list = dishes.value;
      // 关键字过滤：匹配菜品名称或描述
      const kw = (dishKeyword.value || '').trim().toLowerCase();
      if (kw) {
        list = list.filter(d =>
          (d.name && d.name.toLowerCase().includes(kw)) ||
          (d.description && d.description.toLowerCase().includes(kw))
        );
      }
      // 分类过滤
      if (dishFilterCate.value) {
        list = list.filter(d => d.categoryId === dishFilterCate.value);
      }
      return list;
    });
    function clearDishSearch() {
      dishKeyword.value = '';
    }
    const cateName = (id) => {
      const c = categories.value.find(x => x.id === id);
      return c ? c.name : '未分类';
    };

    // 菜品弹窗
    const dishDialog = reactive({ visible: false, id: null, name: '', categoryId: null, price: 0.01, stock: 0, status: 1, image: '', description: '', specs: [] });
    function openDishDialog(row, defaultCateId) {
      Object.assign(dishDialog, row ? {
        visible: true, id: row.id, name: row.name, categoryId: row.categoryId,
        price: row.price, stock: row.stock,
        status: row.status, image: row.image, description: row.description,
        specs: row.specs ? JSON.parse(JSON.stringify(row.specs)) : []
      } : {
        visible: true, id: null, name: '',
        categoryId: defaultCateId || (categories.value.length ? categories.value[0].id : null),
        price: 0.01, stock: 0, status: 1, image: '', description: '', specs: []
      });
    }
    // ===== 菜品管理两级视图：先分类墙，再进分类菜品列表 =====
    const dishView = ref('cates');          // 'cates' 分类墙 / 'dishes' 分类菜品列表
    const dishCurrentCate = ref(null);      // 当前选中的分类
    const dishPriceSort = ref('desc');         // 价格排序：默认 'desc' 高到低 / '' 默认 / 'asc' 低到高
    function enterDishCates() {
      dishView.value = 'cates';
      dishCurrentCate.value = null;
      dishKeyword.value = '';
      dishFilterCate.value = null;
      dishPriceSort.value = 'desc';
    }
    function enterDishList(cate) {
      dishCurrentCate.value = cate;
      dishView.value = 'dishes';
      dishKeyword.value = '';
    }
    function toggleDishPriceSort() {
      // 循环切换：默认 → 低到高 → 高到低 → 默认
      if (dishPriceSort.value === '') dishPriceSort.value = 'asc';
      else if (dishPriceSort.value === 'asc') dishPriceSort.value = 'desc';
      else dishPriceSort.value = '';
    }
    const dishPriceSortText = computed(() => {
      if (dishPriceSort.value === 'asc') return '价格排序 ▲';
      if (dishPriceSort.value === 'desc') return '价格排序 ▼';
      return '价格排序';
    });
    // ===== 估清下架 / 重新上架：按关键字搜索菜品，并处理关联规格项 =====
    const clearanceKeyword = ref('');
    const clearanceSelectedIds = ref([]);
    const clearanceRunning = ref(false);
    const clearanceMode = ref('down'); // down=下架，up=重新上架
    const clearanceCategoryId = ref(null);
    const clearanceCurrentActionableStatus = computed(() => clearanceMode.value === 'down' ? 1 : 0);
    const clearanceNextStatus = computed(() => clearanceMode.value === 'down' ? 0 : 1);
    function enterDishClearance() {
      dishView.value = 'clearance';
      clearanceKeyword.value = '';
      clearanceSelectedIds.value = [];
      clearanceMode.value = 'down';
      clearanceCategoryId.value = null;
    }
    function setClearanceMode(mode) {
      clearanceMode.value = mode;
      clearanceSelectedIds.value = [];
      clearanceCategoryId.value = null;
    }
    const clearanceMatchedDishes = computed(() => {
      const kw = clearanceKeyword.value.trim().toLowerCase();
      const targetStatus = clearanceCurrentActionableStatus.value;
      let list = dishes.value.filter(d => d.status === targetStatus);
      if (clearanceCategoryId.value) {
        list = list.filter(d => d.categoryId === clearanceCategoryId.value);
      }
      if (!kw) return list;
      return list.filter(d => {
        const dishHit = (d.name || '').toLowerCase().includes(kw) ||
          (d.description || '').toLowerCase().includes(kw);
        if (clearanceMode.value === 'up') {
          const c = categories.value.find(x => x.id === d.categoryId);
          if (c && (c.name || '').toLowerCase().includes(kw)) return true;
        }
        return dishHit;
      });
    });
    function clearanceSpecMatches(option, selectedIds, selectedNames) {
      if (!option) return false;
      const linked = option.dishId !== null && option.dishId !== undefined && selectedIds.has(option.dishId);
      const optName = (option.name || '').toLowerCase();
      const named = selectedNames.some(n => {
        if (!n) return false;
        const nl = n.toLowerCase();
        // 双向匹配：选项名包含菜品名（如选项"白切鸡饭"）或菜品名包含选项名（如菜品"白切鸡饭"匹配选项"白切鸡"）
        return optName.includes(nl) || nl.includes(optName);
      });
      return linked || named;
    }
    const clearanceRelatedChanges = computed(() => {
      const selectedIds = new Set(clearanceSelectedIds.value);
      const selectedNames = dishes.value
        .filter(d => selectedIds.has(d.id))
        .map(d => (d.name || '').trim())
        .filter(Boolean);
      const currentStatus = clearanceCurrentActionableStatus.value;
      if (selectedIds.size === 0) return [];
      const changes = [];
      for (const parent of dishes.value) {
        if (selectedIds.has(parent.id)) continue;
        const matches = [];
        (parent.specs || []).forEach(g => (g.options || []).forEach(o => {
          if (clearanceSpecMatches(o, selectedIds, selectedNames) && o.status === currentStatus) {
            matches.push({ group: g, option: o });
          }
        }));
        if (matches.length > 0) changes.push({ dish: parent, matches });
      }
      return changes;
    });
    const clearancePreviewRows = computed(() => {
      const selectedIds = new Set(clearanceSelectedIds.value);
      const currentStatus = clearanceCurrentActionableStatus.value;
      const actionName = clearanceMode.value === 'down' ? '下架' : '恢复';
      const rows = dishes.value
        .filter(d => selectedIds.has(d.id) && d.status === currentStatus)
        .map(d => ({ type: '所选菜品', dish: d, group: null, option: null, source: '关键字命中，将' + actionName + '菜品' }));
      for (const change of clearanceRelatedChanges.value) {
        for (const m of change.matches) {
          rows.push({
            type: clearanceMode.value === 'down' ? '关联规格项' : '恢复关联规格项',
            dish: change.dish,
            group: m.group,
            option: m.option,
            source: `将${actionName}规格「${m.group.name || ''}」中的「${m.option.name || ''}」`
          });
        }
      }
      return rows;
    });
    const clearanceActionCount = computed(() => {
      const selectedIds = new Set(clearanceSelectedIds.value);
      const currentStatus = clearanceCurrentActionableStatus.value;
      const dishCount = dishes.value.filter(d => selectedIds.has(d.id) && d.status === currentStatus).length;
      let specCount = 0;
      for (const change of clearanceRelatedChanges.value) {
        specCount += change.matches.length;
      }
      let categoryCount = 0;
      if (clearanceMode.value === 'up') {
        const categoryIds = new Set(
          dishes.value.filter(d => selectedIds.has(d.id)).map(d => d.categoryId)
        );
        categoryCount = [...categoryIds].filter(id => {
          const c = categories.value.find(x => x.id === id);
          return c && c.status === 0;
        }).length;
      }
      return dishCount + specCount + categoryCount;
    });
    function toggleClearanceDish(dish) {
      const idx = clearanceSelectedIds.value.indexOf(dish.id);
      if (idx >= 0) clearanceSelectedIds.value.splice(idx, 1);
      else clearanceSelectedIds.value.push(dish.id);
    }
    watch([clearanceKeyword, clearanceCategoryId], () => {
      const visible = new Set(clearanceMatchedDishes.value.map(d => d.id));
      clearanceSelectedIds.value = clearanceSelectedIds.value.filter(id => visible.has(id));
    });
    function buildClearanceDishPayload(dish, specs) {
      return {
        id: dish.id,
        shopId,
        status: dish.status,
        specs
      };
    }
    async function runClearance() {
      if (clearanceSelectedIds.value.length === 0) {
        ElementPlus.ElMessage.warning(clearanceMode.value === 'down' ? '请先选择要估清下架的菜品' : '请先选择要重新上架的菜品');
        return;
      }
      const selectedIds = new Set(clearanceSelectedIds.value);
      const currentStatus = clearanceCurrentActionableStatus.value;
      const nextStatus = clearanceNextStatus.value;
      const actionDishCount = dishes.value.filter(d => selectedIds.has(d.id) && d.status === currentStatus).length;
      const specCount = clearanceRelatedChanges.value.reduce((sum, change) => sum + change.matches.length, 0);
      const categoryIds = new Set(
        dishes.value.filter(d => selectedIds.has(d.id)).map(d => d.categoryId)
      );
      const isUp = clearanceMode.value === 'up';
      const categoryCount = isUp
        ? [...categoryIds].filter(id => {
            const c = categories.value.find(x => x.id === id);
            return c && c.status === 0;
          }).length
        : 0;
      if (actionDishCount === 0 && specCount === 0 && categoryCount === 0) {
        ElementPlus.ElMessage.warning(clearanceMode.value === 'down' ? '所选内容没有需要下架的菜品或规格项' : '所选内容没有需要重新上架的菜品或规格项');
        return;
      }
      try {
        await ElementPlus.ElMessageBox.confirm(
          isUp
            ? `将重新上架 ${actionDishCount} 道菜品、${categoryCount} 个分类，并恢复 ${specCount} 个关联规格项，是否继续？`
            : `将下架 ${actionDishCount} 道菜品，并停用 ${specCount} 个关联规格项，是否继续？`,
          isUp ? '重新上架确认' : '估清下架确认',
          { type: isUp ? 'success' : 'warning', confirmButtonText: isUp ? '一键重新上架' : '一键下架', cancelButtonText: '取消' }
        );
      } catch (e) {
        return;
      }
      clearanceRunning.value = true;
      try {
        if (isUp) {
          for (const cid of categoryIds) {
            const c = categories.value.find(x => x.id === cid);
            if (c && c.status === 0) await Api.saveCategory({ id: cid, shopId, status: 1 });
          }
        }
        for (const d of dishes.value) {
          if (selectedIds.has(d.id) && d.status === currentStatus) {
            await Api.saveDish({ id: d.id, status: nextStatus });
          }
        }
        for (const change of clearanceRelatedChanges.value) {
          const specs = JSON.parse(JSON.stringify(change.dish.specs || []));
          let dirty = false;
          for (const g of specs) {
            let activeOptionCount = 0;
            for (const o of (g.options || [])) {
              const hit = change.matches.some(m => m.option.id === o.id);
              if (hit && o.status === currentStatus) {
                o.status = nextStatus;
                dirty = true;
              }
              if (o.status === 1) activeOptionCount += 1;
            }
            if (isUp && g.options && g.options.length > 0 && activeOptionCount > 0 && g.status === 0) {
              g.status = 1;
              dirty = true;
            } else if (!isUp && g.options && g.options.length > 0 && activeOptionCount === 0 && g.status === 1) {
              g.status = 0;
              dirty = true;
            }
          }
          if (dirty) {
            await Api.saveDish(buildClearanceDishPayload(change.dish, specs));
          }
        }
        toast(isUp ? '重新上架完成' : '估清下架完成');
        clearanceSelectedIds.value = [];
        clearanceKeyword.value = '';
        loadCategories();
        loadDishes();
      } catch (e) {
        errToast(e);
      } finally {
        clearanceRunning.value = false;
      }
    }
    const cateDishCount = (cateId) => dishes.value.filter(d => d.categoryId === cateId).length;
    const currentCateDishes = computed(() => {
      if (!dishCurrentCate.value) return [];
      let list = dishes.value.filter(d => d.categoryId === dishCurrentCate.value.id);
      const kw = (dishKeyword.value || '').trim().toLowerCase();
      if (kw) {
        list = list.filter(d =>
          (d.name && d.name.toLowerCase().includes(kw)) ||
          (d.description && d.description.toLowerCase().includes(kw))
        );
      }
      if (dishPriceSort.value === 'asc') {
        list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
      } else if (dishPriceSort.value === 'desc') {
        list = [...list].sort((a, b) => Number(b.price) - Number(a.price));
      }
      return list;
    });
    // ===== 规格配置（含双拼）=====
    const groupTypeText = (t) => ({ 1: '单选', 2: '多选' }[t] || '单选');
    function addSpecGroup() {
      // 默认多选、非必选，可自由选多项（0 ~ 99）
      dishDialog.specs.push({
        name: '', type: 2, required: 0, minSelect: 0, maxSelect: 99,
        sortOrder: dishDialog.specs.length + 1, status: 1, options: []
      });
    }
    async function removeSpecGroup(g, idx) {
      if (!await askDelete(`规格组「${g.name || '未命名'}」`)) return;
      dishDialog.specs.splice(idx, 1);
    }
    function onGroupTypeChange(g) {
      if (g.type === 1) { g.minSelect = 1; g.maxSelect = 1; }
    }
    function addSpecOption(g) {
      g.options.push({ name: '', priceDelta: 0, sortOrder: g.options.length + 1, dishId: null, status: 1 });
    }
    async function removeSpecOption(g, idx) {
      const o = g.options[idx];
      if (!await askDelete(`规格选项「${o.name || '未命名'}」`)) return;
      g.options.splice(idx, 1);
    }
    async function saveDish() {
      if (!dishDialog.name) { ElementPlus.ElMessage.warning('请填写菜品名称'); return; }
      if (!dishDialog.price || dishDialog.price <= 0) { ElementPlus.ElMessage.warning('请填写正确的价格'); return; }
      // 校验规格配置合法性
      for (const g of dishDialog.specs) {
        if (!g.name) { ElementPlus.ElMessage.warning('规格组名称不能为空'); return; }
        for (const o of g.options) {
          if (!o.name) { ElementPlus.ElMessage.warning('规格「' + g.name + '」存在空的选项名'); return; }
        }
      }
      try {
        const payload = {
          id: dishDialog.id || undefined,
          shopId,
          name: dishDialog.name,
          categoryId: dishDialog.categoryId,
          price: dishDialog.price,
          stock: dishDialog.stock,
          status: dishDialog.status,
          image: dishDialog.image,
          description: dishDialog.description,
          specs: dishDialog.specs
        };
        await Api.saveDish(payload);
        toast(dishDialog.id ? '菜品已更新' : '菜品已新增');
        dishDialog.visible = false;
        loadDishes();
      } catch (e) { errToast(e); }
    }
    // 上下架开关
    async function toggleDishStatus(row, on) {
      const target = on ? 1 : 0;
      try {
        await Api.saveDish({ ...row, status: target });
        row.status = target;
        toast(target === 1 ? '已上架' : '已下架');
      } catch (e) {
        errToast(e);
        loadDishes();
      }
    }
    // ===== 删除确认（每次删除都弹窗确认） =====
    async function askDelete(name) {
      try {
        await ElementPlus.ElMessageBox.confirm(`确定删除${name}吗？`, '删除确认', { type: 'warning' });
        return true;
      } catch (e) {
        return false;
      }
    }

    async function deleteDish(row) {
      if (!await askDelete(`菜品「${row.name}」`)) return;
      try {
        await Api.deleteDish(row.id);
        toast('菜品已删除');
        loadDishes();
      } catch (e) {
        if (e === 'cancel' || e === 'close') return;
        errToast(e);
      }
    }

    // ========== 分类管理 ==========
    const categoryDialog = reactive({ visible: false, id: null, name: '', sortOrder: 1, status: 1 });
    function openCategoryDialog(row) {
      Object.assign(categoryDialog, row ? {
        visible: true, id: row.id, name: row.name, sortOrder: row.sortOrder, status: row.status
      } : {
        visible: true, id: null, name: '', sortOrder: categories.value.length + 1, status: 1
      });
    }
    async function saveCategory() {
      if (!categoryDialog.name) { ElementPlus.ElMessage.warning('请填写分类名称'); return; }
      try {
        await Api.saveCategory({
          id: categoryDialog.id || undefined,
          shopId,
          name: categoryDialog.name,
          sortOrder: categoryDialog.sortOrder,
          status: categoryDialog.status
        });
        toast(categoryDialog.id ? '分类已更新' : '分类已新增');
        categoryDialog.visible = false;
        loadCategories();
        loadDishes();
      } catch (e) { errToast(e); }
    }
    async function toggleCategoryStatus(row, on) {
      const target = on ? 1 : 0;
      try {
        await Api.saveCategory({ id: row.id, shopId, status: target });
        row.status = target;
        toast(target === 1 ? '分类已启用' : '分类已停用');
        loadDishes();
      } catch (e) {
        errToast(e);
        loadCategories();
      }
    }
    async function deleteCategory(row) {
      if (!await askDelete(`分类「${row.name}」`)) return;
      try {
        await Api.deleteCategory(row.id);
        toast('分类已删除');
        loadCategories();
        loadDishes();
      } catch (e) { errToast(e); }
    }

    // ========== 桌台管理 ==========
    const tables = ref([]);
    const tableLoading = ref(false);
    async function loadTables() {
      tableLoading.value = true;
      try {
        tables.value = await Api.listTables();
      } catch (e) { errToast(e); } finally { tableLoading.value = false; }
    }
    const tableDialog = reactive({ visible: false, id: null, tableNo: '', status: 1 });
    function openTableDialog(row) {
      Object.assign(tableDialog, row ? {
        visible: true, id: row.id, tableNo: row.tableNo, status: row.status
      } : {
        visible: true, id: null, tableNo: '', status: 1
      });
    }
    async function saveTable() {
      if (!tableDialog.tableNo) { ElementPlus.ElMessage.warning('请填写桌号'); return; }
      try {
        await Api.saveTable({
          id: tableDialog.id || undefined,
          shopId,
          tableNo: tableDialog.tableNo,
          status: tableDialog.status
        });
        toast(tableDialog.id ? '桌台已更新' : '桌台已新增');
        tableDialog.visible = false;
        loadTables();
      } catch (e) { errToast(e); }
    }
    async function deleteTable(row) {
      if (!await askDelete(`桌台「${row.tableNo}」`)) return;
      try {
        await Api.deleteTable(row.id);
        toast('桌台已删除');
        loadTables();
      } catch (e) {
        errToast(e);
      }
    }

    // ========== 订单管理（后厨/商家合二为一，只展示全部订单） ==========
    const orders = ref([]);
    const orderLoading = ref(false);
    async function loadOrders() {
      orderLoading.value = true;
      try {
        orders.value = await Api.listOrders('');
      } catch (e) { errToast(e); } finally { orderLoading.value = false; }
    }
    const tableNo = (id) => {
      const t = tables.value.find(x => x.id === id);
      return t ? t.tableNo : ('桌' + id);
    };

    // ========== 收银统计 ==========
    const cashierPeriod = ref('day');
    const cashier = reactive({ loading: false, data: null });
    const cashierPeriods = [
      { key: 'day', name: '按天' },
      { key: 'week', name: '按周' },
      { key: 'month', name: '按月' },
      { key: 'quarter', name: '按季度' }
    ];
    const cashierPeriodName = computed(() => (cashierPeriods.find(p => p.key === cashierPeriod.value) || {}).name || '');
    async function loadCashier() {
      cashier.loading = true;
      try {
        cashier.data = await Api.cashierSummary(cashierPeriod.value);
      } catch (e) { errToast(e); } finally { cashier.loading = false; }
    }
    function switchCashierPeriod(p) {
      cashierPeriod.value = p;
      loadCashier();
      loadSales();
    }
    // 最近一个周期的统计（rows 时间升序，最后一条最新）
    const cashierLatest = computed(() => {
      const rows = cashier.data && cashier.data.rows;
      return rows && rows.length ? rows[rows.length - 1] : null;
    });
    function cashierPercent(amount) {
      const t = Number(cashier.data && cashier.data.totalAmount) || 0;
      if (t <= 0) return 0;
      return Math.round(Number(amount) / t * 1000) / 10;
    }

    // ===== 菜品销量（扇形图） =====
    const sales = reactive({ loading: false, data: null });
    let salesChart = null;
    async function loadSales() {
      sales.loading = true;
      try {
        sales.data = await Api.salesSummary(cashierPeriod.value, 5);
        renderSalesChart();
      } catch (e) { errToast(e); } finally { sales.loading = false; }
    }
    function renderSalesChart() {
      const el = document.getElementById('salesChart');
      if (!el || !window.echarts) return;
      // 容器不可见（v-show 切换瞬间）时延后渲染
      if (el.clientWidth === 0) {
        nextTick(renderSalesChart);
        return;
      }
      if (!salesChart) {
        salesChart = echarts.init(el);
        window.__salesChart = salesChart;
      }
      salesChart.resize();
      const rows = (sales.data && sales.data.rows) || [];
      const colors = ['#FFA000', '#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399'];
      const option = {
        tooltip: { trigger: 'item', formatter: '{b}<br/>销量 {c} 份 · 占比 {d}%' },
        legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 12 } },
        color: colors,
        series: [{
          name: '菜品销量',
          type: 'pie',
          radius: ['42%', '68%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: true, formatter: '{b}\n{c}份' },
          labelLine: { length: 10, length2: 8 },
          data: rows.map(r => ({ name: r.name, value: r.quantity }))
        }]
      };
      salesChart.setOption(option, true);
    }

    // 切换菜单
    function switchMenu(key) {
      current.value = key;
      if (key === 'dish') { loadDishes(); enterDishCates(); }
      if (key === 'category') loadCategories();
      if (key === 'table') loadTables();
      if (key === 'order') loadOrders();
      if (key === 'cashier') {
        nextTick(() => { loadCashier(); loadSales(); });
      }
    }

    // 初始化加载
    onMounted(() => {
      loadDishes();
      loadCategories();
      loadTables();
      loadOrders();
      // 窗口尺寸变化时自适应图表
      window.addEventListener('resize', () => {
        if (salesChart) salesChart.resize();
      });
    });

    return {
      current, menus, currentTitle, shopId,
      dishes, categories, dishLoading, cateLoading, dishFilterCate, dishKeyword, filteredDishes, clearDishSearch, cateName,
      dishView, dishCurrentCate, dishPriceSort, dishPriceSortText, enterDishCates, enterDishList, toggleDishPriceSort, cateDishCount, currentCateDishes,
      clearanceKeyword, clearanceSelectedIds, clearanceRunning, clearanceMode, clearanceCategoryId, enterDishClearance, setClearanceMode,
      clearanceMatchedDishes, clearancePreviewRows, clearanceActionCount,
      toggleClearanceDish, runClearance,
      dishDialog, openDishDialog, saveDish, toggleDishStatus, deleteDish, loadDishes,
      groupTypeText, addSpecGroup, removeSpecGroup, onGroupTypeChange, addSpecOption, removeSpecOption,
      categoryDialog, openCategoryDialog, saveCategory, toggleCategoryStatus, deleteCategory, loadCategories,
      tables, tableLoading, tableDialog, openTableDialog, saveTable, deleteTable, loadTables,
      orders, orderLoading, loadOrders, tableNo,
      cashierPeriod, cashier, cashierPeriods, cashierPeriodName, cashierLatest,
      loadCashier, switchCashierPeriod, cashierPercent,
      sales, loadSales,
      switchMenu
    };
  }
};

Vue.createApp(App).use(ElementPlus, { locale: ElementPlusLocaleZhCn }).mount('#app');
