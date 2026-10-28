package com.ordering.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ordering.ai.config.AiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 向量嵌入服务（Embedding）
 * 调用火山引擎方舟的 Embedding 接口，把文本转成向量，用于RAG语义检索
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmbeddingService {

    private final AiProperties aiProperties;
    private final RestTemplate restTemplate = new RestTemplate();
    private static final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 文本向量化：传一段文本，返回float数组
     */
    public float[] embed(String text) {
        if (text == null || text.isBlank()) {
            return new float[0];
        }
        List<float[]> result = embedBatch(List.of(text));
        return result.isEmpty() ? new float[0] : result.get(0);
    }

    /**
     * 批量向量化：传多段文本，返回多个向量
     * 火山接口支持批量，一次最多25条，效率更高
     */
    public List<float[]> embedBatch(List<String> texts) {
        if (texts == null || texts.isEmpty()) {
            return new ArrayList<>();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(aiProperties.getApiKey());

        Map<String, Object> body = new HashMap<>();
        // Embedding模型接入点ID（从配置读，和对话模型是不同的接入点）
        body.put("model", aiProperties.getEmbeddingModel());
        body.put("input", texts);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            // Embedding接口地址从配置读
            String embedUrl = aiProperties.getEmbeddingUrl();
            String response = restTemplate.postForObject(embedUrl, request, String.class);

            JsonNode root = objectMapper.readTree(response);
            JsonNode dataArray = root.path("data");

            List<float[]> result = new ArrayList<>();
            for (JsonNode item : dataArray) {
                JsonNode embeddingNode = item.path("embedding");
                float[] vec = new float[embeddingNode.size()];
                for (int i = 0; i < embeddingNode.size(); i++) {
                    vec[i] = (float) embeddingNode.get(i).asDouble();
                }
                result.add(vec);
            }
            return result;
        } catch (Exception e) {
            log.error("Embedding调用失败: ", e);
            throw new RuntimeException("向量生成失败：" + e.getMessage());
        }
    }

    /**
     * 余弦相似度计算：两个向量的夹角余弦值，越接近1越相似
     */
    public static double cosineSimilarity(float[] vecA, float[] vecB) {
        if (vecA == null || vecB == null || vecA.length != vecB.length) {
            return 0;
        }
        double dotProduct = 0;
        double normA = 0;
        double normB = 0;
        for (int i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA == 0 || normB == 0) {
            return 0;
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * float数组转JSON字符串（存数据库用）
     */
    public static String vectorToJson(float[] vec) {
        if (vec == null) return null;
        try {
            return objectMapper.writeValueAsString(vec);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * JSON字符串转float数组（从数据库读取用）
     */
    public static float[] jsonToVector(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            JsonNode node = objectMapper.readTree(json);
            float[] vec = new float[node.size()];
            for (int i = 0; i < node.size(); i++) {
                vec[i] = (float) node.get(i).asDouble();
            }
            return vec;
        } catch (Exception e) {
            return null;
        }
    }
}
