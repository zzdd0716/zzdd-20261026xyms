package com.ordering.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 门店实体
 */
@Data
@TableName("shop")
public class Shop {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 门店名称 */
    private String name;

    /** 门店Logo */
    private String logo;

    /** 联系电话 */
    private String phone;

    /** 门店地址 */
    private String address;

    /** 营业时间 */
    private String openTime;

    /** 门店公告 */
    private String notice;

    /** 状态：1营业中 0已停业 */
    private Integer status;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
