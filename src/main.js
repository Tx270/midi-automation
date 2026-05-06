const express = require("express");
const path = require("path");
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));


app.get("/songs", (req, res) => {
    const dataDir = path.join(__dirname, '..', 'data');
    fs.readdir(dataDir, (err, files) => {
        if (err)
            return res.status(500).send("Error reading directory");
        
        const songs = files.filter(file => file.endsWith('.json')).map(file => file.replace('.json', ''));
        res.status(200).json(songs);
    });
});

app.get("/songs/*", (req, res) => {
    const filePath = path.join(__dirname, '..', 'data', req.params[0] + '.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err)
            return res.status(404).send("File does not exist");
        
        res.status(200).json(JSON.parse(data));
    });
});

app.post("/songs/*", (req, res) => {
    const filePath = path.join(__dirname, '..', 'data', req.params[0] + '.json');
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err)
            return res.status(404).send("File does not exist");
        
        fs.writeFile(filePath, JSON.stringify(req.body, null, 2), (err) => {
            if (err)
                return res.status(500).send("Error writing file");
            
            res.status(200).send("File updated successfully");
        });
    });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server running on http://localhost:${PORT}`); });