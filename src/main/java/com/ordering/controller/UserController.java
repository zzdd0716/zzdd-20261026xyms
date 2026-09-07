package com.ordering.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.ordering.common.result.Result;
import com.ordering.entity.User;
import com.ordering.mapper.UserMapper;
import com.ordering.service.WechatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 用户接口：小程序端登录（wx.login 的 code 换 openid，再换 userId）
 */
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@Tag(name = "用户", description = "小程序登录：code 换 openid 再换 userId")
public class UserController {

    private final UserMapper userMapper;
    private final WechatService wechatService;

    /** 登录：wx.login 的 code 换 openid，已存在则直接返回用户信息，不存在则自动注册 */
    @PostMapping("/login")
    @Operation(summary = "用户登录", description = "传入 wx.login 的 code，后端换取 openid，已存在则返回用户信息，不存在则自动注册")
    public Result<User> login(@RequestBody Map<String, String> body) {
        String code = body == null ? null : body.get("code");
        if (code == null || code.isBlank()) {
            return Result.error("code不能为空");
        }
        String openid = wechatService.code2Session(code);
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getOpenid, openid).last("LIMIT 1"));
        if (user == null) {
            user = new User();
            user.setOpenid(openid);
            user.setNickname("微信用户");
            user.setStatus(1);
            user.setIsAdmin(0);
            user.setCreateTime(LocalDateTime.now());
            user.setUpdateTime(LocalDateTime.now());
            userMapper.insert(user);
        }
        return Result.success(user);
    }

    /** 设置/取消管理员（仅管理员可操作） */
    @PostMapping("/admin/set")
    @Operation(summary = "设置管理员", description = "传入用户ID，设置或取消管理员身份")
    public Result<Void> setAdmin(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        Integer isAdmin = Integer.valueOf(body.get("isAdmin").toString());
        userMapper.update(null,
                new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<User>()
                        .eq(User::getId, userId)
                        .set(User::getIsAdmin, isAdmin));
        return Result.success();
    }

    /** 更新用户昵称和头像 */
    @PostMapping("/update")
    @Operation(summary = "更新用户信息", description = "传入用户ID、昵称、头像URL，更新用户信息")
    public Result<User> updateUser(@RequestBody Map<String, Object> body) {
        Long userId = Long.valueOf(body.get("userId").toString());
        String nickname = body.get("nickname") == null ? null : body.get("nickname").toString();
        String avatar = body.get("avatar") == null ? null : body.get("avatar").toString();
        var wrapper = new com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper<User>()
                .eq(User::getId, userId)
                .set(User::getUpdateTime, LocalDateTime.now());
        if (nickname != null && !nickname.isBlank()) wrapper.set(User::getNickname, nickname);
        if (avatar != null && !avatar.isBlank()) wrapper.set(User::getAvatar, avatar);
        userMapper.update(null, wrapper);
        User user = userMapper.selectById(userId);
        return Result.success(user);
    }
}
