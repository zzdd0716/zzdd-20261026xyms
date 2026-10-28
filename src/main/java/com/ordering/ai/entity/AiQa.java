package com.ordering.ai.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * AI 智能客服 FAQ 常见问题
 */
@Data
@TableName("ai_qa")
public class AiQa {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 门店ID */
    private Long shopId;

    /** 问题 */
    private String question;

    /** 答案 */
    private String answer;

    /** 状态：1启用 0停用 */
    private Integer status;

    /** 问题向量（JSON数组，float列表） */
    private String questionVector;

    /** 向量状态：0未向量化 1已向量化 */
    private Integer vectorStatus;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
