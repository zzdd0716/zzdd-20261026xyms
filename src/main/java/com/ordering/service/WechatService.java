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

    public byte[] getWxacode(String tableId, String page) {
        String token = getAccessToken();
        String url = "https://api.weixin.qq.com/wxa/getwxacode?access_token=" + token;
        Map<String, Object> body = new HashMap<>();
        body.put("path", page + "?tableId=" + tableId);
        body.put("width", 300);
        body.put("auto_color", false);
        RestTemplate restTemplate = new RestTemplate();
        return restTemplate.postForObject(url, body, byte[].class);
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
