const { default: axios } = require("axios");
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  console.log("Getting mod list...");
  const { data } = await axios.get(
    "https://wotbmodmenu.herokuapp.com/api/mods/"
  );
  data.forEach((obj) => {
    console.log(`${obj.id} - ${obj.name}`);
  });
  
  readline.question(
    "Enter the number of the mod you want to install: ", install
  );
}
async function install(number) {
    readline.close()
    let url
     try {
        const { data } = await axios.get(
        `https://wotbmodmenu.herokuapp.com/api/mods/${number}`
      );
        url = data[0].url
        } catch (error) {
             console.log("Incorrect input")
        }
    if (!url) main()
    else {
        
    }
  }
main();
