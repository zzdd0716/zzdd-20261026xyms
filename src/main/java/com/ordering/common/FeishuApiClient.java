package com.ordering.common;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 飞书多维表格 API 工具类
 * 负责调用飞书 Open API，把业务数据同步到多维表格
 */
@Component
public class FeishuApiClient {

    private static final Logger log = LoggerFactory.getLogger(FeishuApiClient.class);

    // 从配置文件读取飞书应用凭证
    @Value("${feishu.app-id:}")
    private String appId;

    @Value("${feishu.app-secret:}")
    private String appSecret;

    @Value("${feishu.base-token:}")
    private String baseToken;

    // 飞书 API 基础地址
    private static final String FEISHU_BASE_URL = "https://open.feishu.cn/open-apis";

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 获取 tenant_access_token（飞书接口的统一认证 token）
     */
    public String getTenantAccessToken() {
        String url = FEISHU_BASE_URL + "/auth/v3/tenant_access_token/internal";

        Map<String, String> body = new HashMap<>();
        body.put("app_id", appId);
        body.put("app_secret", appSecret);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

        try {
            JsonNode result = objectMapper.readTree(response.getBody());
            if (result.get("code").asInt() == 0) {
                return result.get("tenant_access_token").asText();
            } else {
                log.error("获取飞书 access_token 失败: {}", result.get("msg").asText());
                throw new RuntimeException("获取飞书 access_token 失败");
            }
        } catch (Exception e) {
            log.error("解析飞书返回数据失败", e);
            throw new RuntimeException("解析飞书返回数据失败", e);
        }
    }

    /**
     * 批量写入记录到多维表格
     *
     * @param tableId  多维表格的表 ID
     * @param records  要写入的记录列表，每个 record 是一个 Map<字段名, 值>
     */
    public void batchCreateRecords(String tableId, List<Map<String, Object>> records) {
        String token = getTenantAccessToken();
        String url = FEISHU_BASE_URL + "/bitable/v1/apps/" + baseToken + "/tables/" + tableId + "/records/batch_create";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        Map<String, Object> body = new HashMap<>();
        body.put("records", records);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

        try {
            JsonNode result = objectMapper.readTree(response.getBody());
            if (result.get("code").asInt() == 0) {
                log.info("飞书多维表格数据同步成功，写入 {} 条记录", records.size());
            } else {
                log.error("飞书多维表格数据同步失败: {}", result.get("msg").asText());
                throw new RuntimeException("飞书数据同步失败");
            }
        } catch (Exception e) {
            log.error("解析飞书返回数据失败", e);
            throw new RuntimeException("解析飞书返回数据失败", e);
        }
    }
}
