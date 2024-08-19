const FILEINPUT = document.getElementById("fileinput");
const ADDALT = document.getElementById("addaltitude");
const CONVERTBTN = document.getElementById("convertbtn");

FILEINPUT.addEventListener("change", (e) => {
  CONVERTBTN.disabled = (e.target.files.length != 1);
});

CONVERTBTN.addEventListener("click", () => {
  const file = FILEINPUT.files[0];
  if (!file)
    return;

  // Prepare filename info, check file extension.
  const fileinfo = file.name.split(".");
  if (fileinfo.length != 2 || fileinfo[1] != "gpx") {
    alert("Invalid input file!");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const text = reader.result;
    const json = GPX2GeoJSON.fromText(text, {
      "addAltitude": ADDALT.checked
    });
    const jsonstr = JSON.stringify(json, null, "  ");
    const blob = new Blob([jsonstr], {"type": "application/json"});
    const bloburl = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = bloburl;
    a.download = fileinfo[0] + ".json";
    a.style = "display: none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(bloburl);
  };

  reader.readAsText(file, "UTF-8");
});
