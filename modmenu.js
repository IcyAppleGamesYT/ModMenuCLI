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

const code = async (code)=>{
try {
    var { data } = await axios.get(
    `https://wotbmodmenu.herokuapp.com/api/code/${code}`
  );
} catch (error) {
  
}
  if (data && data.length > 0) {
    const obj = data[0]
    console.log(`\n   ${obj.name} | Made by ${obj.author} ${obj.version === null ? '' : '| Made for version: '+obj.version}`)
    readline.question('\nIs this the mod you want to install? y/n: ',async (answer)=>{
      if (answer === "y") await install(obj.code,true)
      else await main()
    })
  } else {
    console.log("Code not found")
    await main()
  }

}

const choice = async (number)=>{
  if (isNaN(number)) {
    console.log("That's not a number\n")
    await main()
  } else if (number > 0) await install(number,false)
  else {
    readline.question("Enter your special code: ", code)
  }
}

async function main() {
  console.log("Getting mod list...");
  const { data } = await axios.get(
    "https://wotbmodmenu.herokuapp.com/api/mods/"
  );
  console.log(`    0 - Special Code`)
  data.forEach((obj) => {
    console.log(`    ${obj.id} - ${obj.name} | Made by ${obj.author} | ${obj.version === null ? '' : '| Made for version: '+obj.version}`);
  });

  readline.question(
    "Enter the number of the mod you want to install: ",
    choice
  );
}
async function install(number, isCode) {
  console.log("Getting download link...")
  let url;
  try {
    const { data } = await axios.get(
      isCode ? `https://wotbmodmenu.herokuapp.com/api/code/id/${number}` : `https://wotbmodmenu.herokuapp.com/api/mods/${number}`
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
        console.log("Finished installing!")
        await main()
      });
  }
}
main();
