const { default: axios } = require("axios");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});
const request = require("superagent");
const fs = require("fs");
const admZip = require("adm-zip");
const path = require("path");

const recursiveReplacer = async (download, game) => {
  fs.readdirSync(download).forEach((file) => {
    const newpath = path.join(download, file);
    const gamepath = path.join(game, file);
    if (file.substring(file.lastIndexOf(".")) !== ".zip") {
      if (!fs.lstatSync(newpath).isDirectory()) {
        fs.copyFileSync(newpath,gamepath)
      } else {
        recursiveReplacer(newpath, gamepath);
      }
    }
  });
};

async function main() {
  console.log("Getting mod list...");
  const { data } = await axios.get(
    "https://wotbmodmenu.herokuapp.com/api/mods/"
  );
  data.forEach((obj) => {
    console.log(`${obj.id} - ${obj.name} | Made by ${obj.author}`);
  });

  readline.question(
    "Enter the number of the mod you want to install: ",
    install
  );
}
async function install(number) {
  readline.close();
  console.log("Getting download link...")
  let url;
  try {
    const { data } = await axios.get(
      `https://wotbmodmenu.herokuapp.com/api/mods/${number}`
    );
    url = data[0].url;
  } catch (error) {
    console.log("Incorrect input");
  }
  if (!url) main();
  else {
    const dirpath = path.join(__dirname, "..", "World of Tanks Blitz");
    const downloadpath = path.join(__dirname, "download");
    if (!fs.existsSync(downloadpath))
      fs.mkdirSync(downloadpath)
    const zippath = path.join(__dirname, "download", "download.zip");
    console.log("Downloading mod...")
    request
      .get(`${url}`)
      .on("error", function (error) {
        console.log(error);
      })
      .pipe(fs.createWriteStream(zippath))
      .on("finish", async function () {
        console.log("Installing mod...")
        const zip = new admZip(zippath);
        zip.extractAllTo(downloadpath, true);
        fs.unlinkSync(zippath, (err) => {
          if (err) console.error("couldn't delete zip: " + err);
        });
        await recursiveReplacer(downloadpath, dirpath);
        fs.readdirSync(downloadpath).forEach((file) => {
          const delpath = path.join(downloadpath, file);
          if (fs.lstatSync(delpath).isDirectory()) fs.rmdirSync(delpath,{recursive: true, force: true});
          else
            fs.unlinkSync(path.join(downloadpath, file), (err) => {
              if (err) console.log(err);
            });
        });
      });
  }
}
main();
