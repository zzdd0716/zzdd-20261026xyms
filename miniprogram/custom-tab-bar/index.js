Component({
  data: {
    selected: 0,
    hidden: false,
    list: [
      { pagePath: '/pages/menu/menu', text: '点餐', icon: '/images/tab/menu.png', activeIcon: '/images/tab/menu-active.png' },
      { pagePath: '/pages/cart/cart', text: '购物车', icon: '/images/tab/cart.png', activeIcon: '/images/tab/cart-active.png' },
      { pagePath: '/pages/orders/orders', text: '订单', icon: '/images/tab/orders.png', activeIcon: '/images/tab/orders-active.png' },
      { pagePath: '/pages/profile/profile', text: '我的', icon: '/images/tab/profile.png', activeIcon: '/images/tab/profile-active.png' }
    ]
  },
  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const url = this.data.list[index].pagePath;
      wx.switchTab({ url });
    }
  }
});
