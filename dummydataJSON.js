/**
 * Created by vedranma on 16.1.2015.
 *
 */
app.fileManagerDemoDataLoad = [
    {
        "filename": "Sarajevo",
        "filetype": "html",
        "filesize": 0.021484375,
        "filecontent": "Capital City of Bosnia",
        "bookmark": false,
        "fileoptions": "",
        "id": "e998b21e-107f-aac9-79c2-20202e13c328"
    },
    {
        "filename": "Amsterdam",
        "filetype": "html",
        "filesize": 0.021484375,
        "filecontent": "Capital City of Holland",
        "bookmark": false,
        "fileoptions": "",
        "id": "gr354675-2433-33h6-f34a-42902rt3c548"
    }
]

app.fileManagerDemoDataLoad.forEach(function (key, value) {
    app.filesList.create(key);
})