/**
 * config.js —— 后端接口地址配置
 *
 * 联调说明：
 * 1. 微信开发者工具中调试：保持 http://localhost:8080 即可（工具已配置 urlCheck:false 不校验域名）
 * 2. 真机预览：把 BASE_URL 改成电脑的局域网 IP，如 http://192.168.1.100:8080
 * 3. 正式发布：必须在微信公众平台「开发管理-服务器域名」配置 https 合法域名
 */
const BASE_URL = 'https://548c78b0.r3.cpolar.top';

module.exports = {
  BASE_URL,
  // 默认门店ID（与后端示例数据一致）
  DEFAULT_SHOP_ID: 1
};
