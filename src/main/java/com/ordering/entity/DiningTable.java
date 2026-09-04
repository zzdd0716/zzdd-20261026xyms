package com.ordering.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 桌台实体
 */
@Data
@TableName("dining_table")
public class DiningTable {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 所属门店ID */
    private Long shopId;

    /** 桌号 */
    private String tableNo;

    /** 二维码标识 */
    private String qrCode;

    /** 可坐人数 */
    private Integer seatCount;

    /** 状态：1空闲 2用餐中 0停用 */
    private Integer status;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
