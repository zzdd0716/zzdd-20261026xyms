package com.ordering.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;

@Service
public class WechatService {

    @Value("${wechat.appid:}")
    private String appid;

    @Value("${wechat.secret:}")
    private String secret;

    private String accessToken;
    private long tokenExpireTime;

    public String getAccessToken() {
        if (accessToken != null && System.currentTimeMillis() < tokenExpireTime) {
            return accessToken;
        }
        String url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" + appid + "&secret=" + secret;
        RestTemplate restTemplate = new RestTemplate();
        @SuppressWarnings("unchecked")
        Map<String, Object> result = restTemplate.getForObject(url, Map.class);
        if (result == null || result.get("access_token") == null) {
            throw new RuntimeException("获取微信access_token失败：" + result);
        }
        accessToken = (String) result.get("access_token");
        Integer expiresIn = result.get("expires_in") != null ? ((Number) result.get("expires_in")).intValue() : 7200;
        tokenExpireTime = System.currentTimeMillis() + (expiresIn - 300) * 1000L;
        return accessToken;
    }

    /**
     * 生成桌台小程序码（getwxacode，有数量限制）
     */
    public byte[] getWxacode(String tableId, String page) {
        String token = getAccessToken();
        String url = "https://api.weixin.qq.com/wxa/getwxacode?access_token=" + token;
        Map<String, Object> body = new HashMap<>();
        body.put("path", page + "?tableId=" + tableId);
        body.put("width", 300);
        body.put("auto_color", false);
        RestTemplate restTemplate = new RestTemplate();
        byte[] data = restTemplate.postForObject(url, body, byte[].class);
        checkWxError(data, "生成桌台码");
        return data;
    }

    /**
     * 生成无限量小程序码（getwxacodeunlimit）：scene 参数带入自提标识，长期张贴用
     *
     * @param scene   场景值，如 type=pickup（≤32 个可见字符）
     * @param page    小程序页面路径（不能带 query 参数），如 pages/index/index
     * @param envVersion 小程序版本：release 正式 / trial 体验 / develop 开发（为空则用微信默认 release）
     */
    public byte[] getWxacodeUnlimit(String scene, String page, String envVersion) {
        String token = getAccessToken();
        String url = "https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=" + token;
        Map<String, Object> body = new HashMap<>();
        body.put("scene", scene);
        body.put("page", page);
        body.put("width", 430);
        body.put("check_path", false);
        if (envVersion != null && !envVersion.isEmpty()) {
            body.put("env_version", envVersion);
        }
        RestTemplate restTemplate = new RestTemplate();
        byte[] data = restTemplate.postForObject(url, body, byte[].class);
        checkWxError(data, "生成自提码");
        return data;
    }

    /**
     * 微信接口失败时返回 JSON 错误（如 appid 无权限、页面未发布），正常应返回图片字节流；检测到 JSON 错误直接抛异常
     */
    private void checkWxError(byte[] data, String action) {
        if (data != null && data.length > 0 && data[0] == (byte) '{') {
            String errText = new String(data, java.nio.charset.StandardCharsets.UTF_8);
            throw new RuntimeException(action + "小程序码失败：" + errText);
        }
    }

    /**
     * 用 wx.login 的 code 换取 openid
     */
    public String code2Session(String code) {
        String url = "https://api.weixin.qq.com/sns/jscode2session?appid=" + appid
                + "&secret=" + secret
                + "&js_code=" + code
                + "&grant_type=authorization_code";
        RestTemplate restTemplate = new RestTemplate();
        // 微信接口返回 text/plain，用 String 接收后手动解析
        String response = restTemplate.getForObject(url, String.class);
        try {
            ObjectMapper mapper = new ObjectMapper();
            @SuppressWarnings("unchecked")
            Map<String, Object> result = mapper.readValue(response, Map.class);
            if (result == null || result.get("openid") == null) {
                throw new RuntimeException("微信登录失败：" + response);
            }
            return (String) result.get("openid");
        } catch (Exception e) {
            throw new RuntimeException("微信登录响应解析失败：" + response, e);
        }
    }
}
