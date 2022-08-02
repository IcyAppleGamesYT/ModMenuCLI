const { default: axios } = require("axios");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});
const request = require("superagent");
const fs = require("fs");
const admZip = require("adm-zip");
const path = require("path");
const fse = require('fs-extra');

const backup = path.join(__dirname,"backup")
let dirpath = path.join(__dirname, "..", "packs");
    if (!fs.existsSync(dirpath)) {
      dirpath = path.join(__dirname,'..','..',"packs")
    }

async function checkBackup(dirpath) {
  try {
  if (!fs.existsSync(backup)) {
    console.log("Creating back-up")
    fs.mkdirSync(backup)
    fse.copySync(dirpath,backup)
  } 
  } catch (err) {
    console.log("Something went wrong with backup")
  }
}
async function reset(isHard) {
  console.log("Resetting WoTB...")
  fs.rmdirSync(dirpath,{ recursive: true, force: true })
  if (isHard) fs.rmdirSync(backup,{ recursive: true, force: true })
  else if (fs.existsSync(backup)) fse.copySync(backup,dirpath,{overwrite: true})
}

const recursiveReplacer = async (download, game) => {
  const list = fs.readdirSync(download)
  if (list.includes("script.js")) {
    try {
      const {main} = require('./download/script.js')
      await main(download,game)
    } catch (error) {
      console.log(error)
    }
  } else {
  list.forEach((file) => {
    const newpath = path.join(download, file);
    const gamepath = path.join(game, file);
    if (file.substring(file.lastIndexOf(".")) !== ".zip") {
      if (!fs.lstatSync(newpath).isDirectory()) {
        fs.copyFileSync(newpath, gamepath);
      } else {
        if (!fs.existsSync(gamepath)) fs.mkdirSync(gamepath)
        recursiveReplacer(newpath, gamepath);
      }
    }
  });
}
};

const code = async (code) => {
  if (code === "reset") await reset(false)
  else if (code === "hardreset") await reset(true)
  else {
    try {
      var { data } = await axios.get(
        `https://wotbmodmenu.herokuapp.com/api/code/${code}`
      );
    } catch (error) {}
    if (data && data.length > 0) {
      const obj = data[0];
      console.log(
        `\n   ${obj.name} | Made by ${obj.author} ${
          obj.version === null ? "" : "| Made for version: " + obj.version
        }`
      );
      readline.question(
        "\nIs this the mod you want? y/n: ",
        async (answer) => {
          if (answer === "y") await install(obj.code, true);
          else await main();
        }
      );
    } else {
      console.log("Code not found");
      await main();
    }
  }
};

const choice = async (number) => {
  if (isNaN(number)) {
    console.log("That's not a number\n");
    await main();
  } else if (number > 0) await install(number, false);
  else {
    console.log("Don't bother guessing codes, the chance of guessing one is so much smaller than getting a tank from a crate.\n")
    readline.question("Enter your special code: ", code);
  }
};
let first = true
async function main() {
  if (first) {
    console.log("To see updates regarding mods or the menu itself and to contact the creators of the mods, join the server:\nhttps://discord.gg/YAjUgVX")
  console.log("If a version of WoTB is specified with a mod and it's outdated, it will most likely cause game crashes.")
  console.log("If you encounter any issues with a mod or the modmenu itself, contact Blitzhax.")
  first = false
  }
  console.log("Getting mod list...");
  const { data } = await axios.get(
    "https://wotbmodmenu.herokuapp.com/api/mods/"
  );
  console.log(`    0 - Special Code`);
  data.forEach((obj) => {
    console.log(
      `    ${obj.id} - ${obj.name} | Made by ${obj.author} ${
        obj.version === null ? "" : "| Made for version: " + obj.version
      }`
    );
  });
  readline.question(
    "Enter the number of the option you want: ",
    choice
  );
}
async function install(number, isCode) {
  console.log("Getting download link...");
  let url;
  try {
    const { data } = await axios.get(
      isCode
        ? `https://wotbmodmenu.herokuapp.com/api/code/id/${number}`
        : `https://wotbmodmenu.herokuapp.com/api/mods/${number}`
    );
    url = data[0].url;
  } catch (error) {
    console.log("Incorrect input"); 
  }
  if (!url) main();
  else {
    await checkBackup(dirpath)
    const downloadpath = path.join(__dirname, "download");
    try {
      if (!fs.existsSync(downloadpath)) fs.mkdirSync(downloadpath);
      const zippath = path.join(__dirname, "download", "download.zip");
      console.log("Downloading mod...");
      request
        .get(`${url}`)
        .on("error", function (error) {
          console.log("Couldn't download file");
        })
        .pipe(fs.createWriteStream(zippath))
        .on("finish", async function () {
          console.log("Installing mod...");
          const zip = new admZip(zippath);
          zip.extractAllTo(downloadpath, true);
          fs.unlinkSync(zippath, (err) => {
            if (err) console.error("couldn't delete zip: " + err);
          });
          await recursiveReplacer(downloadpath, dirpath);
          fs.readdirSync(downloadpath).forEach((file) => {
            if (file.substring(file.lastIndexOf(".")) !== ".zip") {
              const delpath = path.join(downloadpath, file);
              if (fs.lstatSync(delpath).isDirectory())
                fs.rmdirSync(delpath, { recursive: true, force: true });
              else
                fs.unlink(path.join(downloadpath, file), (err) => {
                  if (err) console.log(err);
                });
            }
          });
          console.log("Finished installing!");
          await main();
        });
    } catch (err) {
      console.log("Something went wrong");
      await main();
    }
  }
}
main();
