const { default: axios } = require("axios");
const fs = require("fs");
const path = require("path");
const request = require("superagent");
const admZip = require("adm-zip");


async function clearfolder(downloadpath) {
    fs.readdirSync(downloadpath).forEach((file) => {
        if (file.substring(file.lastIndexOf(".")) !== ".zip") {
          const delpath = path.join(downloadpath, file);
          if (fs.lstatSync(delpath).isDirectory())
            fs.rmSync(delpath, { recursive: true, force: true });
          else
            fs.unlinkSync(path.join(downloadpath, file), (err) => {
              if (err) console.log(err);
            });
        }})
}

async function replacer(download) {
    const list = fs.readdirSync(download)
    list.forEach(file=>{
        if (file.substring(file.lastIndexOf(".")) !== ".zip")
        fs.copyFileSync(path.join(download,file),path.join(__dirname,file))
    })
}

async function update() {
    console.log("Receiving update...")
    const downloadpath = path.join(__dirname,"download")
    const filepath = path.join(downloadpath,"update.zip")
    try {
        const { data } = await axios.get(
            "https://wotbmodmenu.herokuapp.com/api/value/update"
          );
            if (!data[0])
                throw Error("Something went wrong getting the update.")
        if (!fs.existsSync(downloadpath)) fs.mkdirSync(downloadpath)
        else await clearfolder(downloadpath)
        console.log("Downloading update")
     request
        .get(`${data[0].value}`)
        .on("error", function (error) {
          console.log("Couldn't update the ModMenu");
        })
        .pipe(fs.createWriteStream(filepath))
        .on("finish", async function () {
            console.log('Installing update')
            const zip = new admZip(filepath);
            zip.extractAllTo(downloadpath, true);
            fs.unlinkSync(filepath,err=>{if (err) console.log("Couldn't delete zip "+err)})
            await replacer(downloadpath)
            await clearfolder(downloadpath)
            console.log("Update has finished.")
            const {runFirst} = require('./modmenu')
            await runFirst()
        })
    } catch (err) {
        console.log("Something went wrong during an update " + err)
    }
}

async function start() {
    console.log("Checking for updates and/or waking up server...")
    if (!fs.existsSync("version.txt")) await update()
    else {
try {
    const { data } = await axios.get(
        "https://wotbmodmenu.herokuapp.com/api/value/version"
      );
      if (data && data[0]?.value !== fs.readFileSync(path.join(__dirname,"version.txt"),'utf-8'))
            await update()
        else {
            const {runFirst} = require('./modmenu')
            await runFirst()
        } 
} catch (err) {
    console.log("Something went wrong with updater" + err)
}}
}
start()