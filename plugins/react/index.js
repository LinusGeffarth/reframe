const renderToDomFile = require.resolve('./renderToDom');
const renderToHtmlFile = require.resolve('./renderToHtml');
const webpackBrowserConfig = require('./webpackBrowserConfig');
const webpackNodejsConfig = require('./webpackNodejsConfig');
const $getters = require('./getters');
const $name = require('./package.json').name;

module.exports = {
    $name,
    $getters,

    renderToHtmlFile,

    renderToDomFile,
    browserConfigs: ['renderToDomFile'],

    webpackBrowserConfig,
    webpackNodejsConfig,

    ejectables: [
        {
            name: 'renderer',
            description: 'Eject the react rendered. In other words the code that runs `ReactDOM.hydrate` and `ReactDOMServer.renderToStaticMarkup`.',
            actions: [
                {
                    targetDir: 'renderer/',
                    configIsFilePath: true,
                    configPath: 'renderToDomFile',
                },
                {
                    targetDir: 'renderer/',
                    configIsFilePath: true,
                    configPath: 'renderToHtmlFile',
                },
            ],
        }
    ],
};
