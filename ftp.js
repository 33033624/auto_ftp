// 基于ssh2-sftp-client 实现代码自动化上传能力 可与多种模式进行结合

let fs = require("fs");
let Client = require("ssh2-sftp-client");
let path = require("path");
let sftp = new Client();
let recursive = require("recursive-readdir");
let options = JSON.parse(fs.readFileSync("./server.config.json", "utf-8"));
try {
  sftp.connect(options).then(res => {
    // 读取文件夹

    recursive(options.local_path, [], async (err, files) => {
      new Promise(async (c, e) => {
        let list = await sftp.list(options.remote_path);

        for (let i in list) {
          let data = list[i];

          if (data.type === "-") {
            // 文件
            console.log("移除文件：", options.remote_path + data.name);

            await sftp.delete(options.remote_path + data.name);
          } else if (data.type === "d") {
            // 文件夹
            console.log("移除文件夹：", options.remote_path + data.name);

            await sftp.rmdir(options.remote_path + data.name, true);
          }
        }

        // 上传数据

        for (let i = 0; i < files.length; i++) {
          let file = files[i];

          let s = file.split("/");

          // 注：路径这里根据自己的实际需要进行拼接
          //  s.splice(0, 2);

          // 文件短路径

          let shortPath = "";

          for (let idx = 0; idx < s.length; idx++) {
            shortPath += `${s[idx]}${idx === s.length - 1 ? "" : "/"}`;
          }

          // 文件夹路径

          let serverP = "";

          s.forEach((sp, idx) => {
            if (idx !== s.length - 1) {
              serverP += `${sp}/`;
            }
          });

          // 文件夹是否存在
          let serverPath = (options.remote_path + serverP).replace(
            options.local_path,
            ""
          );
          try {
            await sftp.stat(serverPath);
          } catch (e) {
            await sftp.mkdir(serverPath, true);
          }

          const putPath = (options.remote_path + shortPath).replace(
            options.local_path,
            ""
          );
          console.log("更新：", path.join(path.resolve(file)), "\n", putPath);
          await sftp.put(path.join(path.resolve(file)), putPath);
        }
        console.log("---------------- 上传完成 --------------");

        return sftp.end();
      });
    });
  });
} catch (e) {
  console.log("---------------- 上传失败 --------------");
  console.log(e);
}
