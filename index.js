const axios = require('axios');
require('dotenv').config()
const jenkinsPath = process.env.URL; // should be similar to https://testgrid.wso2.com/blue/rest/organizations/jenkins/pipelines/U2/pipelines/Integration-Tests/pipelines/product-apim/pipelines/apim-4.1.0-intg-testgrid-pipeline/runs/
const authString = process.env.AUTH
const nodesRelativeUrl = 'nodes/'
const logDownloadRelativePath = '/log/?start=0&download=true'
const fs = require('fs');

let getData = function (path, auth) {
  return new Promise((resolve, reject) => {
    axios.get(path, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(auth).toString('base64')
      }
    })
      .then((response) => {
        resolve(response.data)
      })
      .catch((error) => {
        console.log("error occured: " , error);
        reject(error);
      });
  });
}

async function main() {
  let data = await getData(jenkinsPath, authString);
  for (let i = 0; i < data.length; i++) {
    const element = data[i];
    const buildId = element.id
    if (element.result == 'FAILURE') {
      console.log("Failed build id = ", element.id)
      // get node data
      const nodeDataPath = jenkinsPath + element.id + "/" + nodesRelativeUrl
      let nodeData = await getData(nodeDataPath, authString);
      for ( let j = 0; j < nodeData.length; j++) {
        const nodeId = nodeData[j].id;
        // console.log(nodeData[j])

        if (nodeData[j].result == 'FAILURE') { 
          console.log("Failed node id", nodeId, "Failed display name : ", nodeData[j].displayName);
          if (nodeData[j].displayName.startsWith("Testing ")) {
            // downlod log file 

            const downloadLink = nodeDataPath + nodeId + logDownloadRelativePath
            const pipeName = nodeData[j].displayName.split(' ').pop()
            await downloadFile(downloadLink, authString, "test/" + buildId + "-" + pipeName + ".txt")
          }
        } else {
          // console.log(nodeData[j].result, "node id", nodeId, "Failed display name : ", nodeData[j].displayName);
        }
      }
      // console.log(nodeData)

    } else {
      console.log("Success build id = ", element.id)
    }

  }
}

const downloadFile = async (url, auth, filePath) => {
  const response = await axios({
    url: url,
    method: 'GET',
    responseType: 'stream',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(auth).toString('base64')
    }
  });

  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

main()