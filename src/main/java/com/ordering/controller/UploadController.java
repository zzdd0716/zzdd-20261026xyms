package com.ordering.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private static final String UPLOAD_DIR = System.getProperty("user.dir") + "/uploads/";

    @PostMapping("/image")
    public Map<String, Object> uploadImage(@RequestParam("file") MultipartFile file) {
        Map<String, Object> result = new HashMap<>();
        try {
            if (file.isEmpty()) {
                result.put("code", 400);
                result.put("message", "文件为空");
                return result;
            }
            File dir = new File(UPLOAD_DIR);
            if (!dir.exists()) dir.mkdirs();

            String originalName = file.getOriginalFilename();
            String ext = originalName.substring(originalName.lastIndexOf("."));
            String fileName = UUID.randomUUID().toString() + ext;
            File dest = new File(UPLOAD_DIR + fileName);
            file.transferTo(dest);

            String url = "/uploads/" + fileName;
            result.put("code", 200);
            result.put("url", url);
            result.put("message", "上传成功");
        } catch (IOException e) {
            result.put("code", 500);
            result.put("message", "上传失败：" + e.getMessage());
        }
        return result;
    }

    /** base64 上传（小程序真机用，避免 uploadFile 域名校验） */
    @PostMapping("/image-base64")
    public Map<String, Object> uploadImageBase64(@RequestBody Map<String, String> body) {
        Map<String, Object> result = new HashMap<>();
        try {
            String base64 = body.get("image");
            if (base64 == null || base64.isBlank()) {
                result.put("code", 400);
                result.put("message", "图片数据为空");
                return result;
            }
            // 去掉 data:image/xxx;base64, 前缀
            if (base64.contains(",")) {
                base64 = base64.substring(base64.indexOf(",") + 1);
            }
            byte[] bytes = Base64.getDecoder().decode(base64);

            File dir = new File(UPLOAD_DIR);
            if (!dir.exists()) dir.mkdirs();

            String fileName = UUID.randomUUID().toString() + ".png";
            File dest = new File(UPLOAD_DIR + fileName);
            try (FileOutputStream fos = new FileOutputStream(dest)) {
                fos.write(bytes);
            }

            String url = "/uploads/" + fileName;
            result.put("code", 200);
            result.put("url", url);
            result.put("message", "上传成功");
        } catch (Exception e) {
            result.put("code", 500);
            result.put("message", "上传失败：" + e.getMessage());
        }
        return result;
    }
}
