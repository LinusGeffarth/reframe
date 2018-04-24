const assert_internal = require('reassert/internal');
const assert_usage = require('reassert/usage');
const findProjectFiles = require('./findProjectFiles');
const pathModule = require('path');
const {processNodejsConfig} = require('./process-config/processNodejsConfig');

module.exports = getProjectConfig;

let projectConfig__cache;

function getProjectConfig(...args) {
    if( ! projectConfig__cache ) {
        projectConfig__cache = computeProjectConfig(...args);
    }
    return projectConfig__cache;
}

function computeProjectConfig({projectNotRequired=false, pluginRequired=false}={}) {
    let {reframeConfigFile, pagesDir, packageJsonFile, projectRootDir} = findProjectFiles({projectNotRequired});

    const projectFound = !!packageJsonFile;

    const reframeConfig = reframeConfigFile && require(reframeConfigFile) || null;

    // TODO move this to build plugin
    assert_usage(
        projectNotRequired || pagesDir || reframeConfig && reframeConfig.webpackBrowserConfigModifier && reframeConfig.webpackServerConfigModifier,
        "No `pages/` directory found nor is `webpackBrowserConfig` and `webpackServerConfig` defined in `reframe.config.js`."
    );

    const {foundPlugins, foundPluginNames} = findPlugins({packageJsonFile});

    const extraPlugins = [
        ...foundPlugins
    ];

    if( projectFound && pluginRequired ) {
        assert_plugin_found({
            loadedPlugins: getLoadedPlugins(),
            projectRootDir,
            packageJsonFile,
        });
    }

    const projectConfig = {};

    setProjectConfig();

    return projectConfig;

    function addPlugin(plugin) {
        extraPlugins.push(plugin);
        setProjectConfig();
    }

    function setProjectConfig() {
        for(const prop in projectConfig) {
            delete projectConfig[prop];
        }

        const processed = processNodejsConfig({reframeConfig, extraPlugins});
        assert_internal(processed);
        const descriptors = Object.getOwnPropertyDescriptors(processed);
        for(const prop in descriptors) {
            Object.defineProperty(projectConfig, prop, descriptors[prop]);
        }

        Object.assign(projectConfig, {
            addPlugin,
            _packageJsonPlugins: foundPluginNames,
            _packageJsonFile: packageJsonFile,
            _loadedPlugins: getLoadedPlugins(),
        });
    }

    function getLoadedPlugins() {
        return [...((reframeConfig||{}).plugins||[]), ...extraPlugins];
    }
}

function findPlugins({packageJsonFile}) {
    if( !packageJsonFile ) {
        return {foundPlugins: [], foundPluginNames: []};
    }

    const nodeModulesParentDir = pathModule.dirname(packageJsonFile);

    const foundPluginNames = (
        getDependencies({packageJsonFile})
        .filter(depPackageName =>
            isReframePlugin({depPackageName, packageJsonFile, nodeModulesParentDir})
        )
    );

    const foundPlugins = (
        foundPluginNames
        .map(depPackageName =>
            loadReframePlugin({depPackageName, nodeModulesParentDir})
        )
    );

    return {foundPlugins, foundPluginNames};
}
function getDependencies({packageJsonFile}) {
    assert_internal(pathModule.isAbsolute(packageJsonFile));
    let packageJson;
    try {
        packageJson = require(packageJsonFile);
    } catch (err) {
        assert_usage(
            false,
            "Couldn't load your app's `package.json` at `"+packageJsonFile+"`.",
            "Is your `package.json` well formated?",
            "The original error is printed above."
        );
    }
    return (Object.keys(packageJson.dependencies||{}));
}
function loadReframePlugin({depPackageName, nodeModulesParentDir}) {
    const packageEntry = require.resolve(depPackageName, {paths: [nodeModulesParentDir]});
    return require(packageEntry)();
}
function isReframePlugin({packageJsonFile, depPackageName, nodeModulesParentDir}) {
    const depPackageJson = getDepPackageJson({depPackageName, nodeModulesParentDir});
    return depPackageJson && depPackageJson.reframePlugin;
}
function getDepPackageJson({nodeModulesParentDir, depPackageName}) {
    const filePath = pathModule.join(depPackageName, './package.json');
    let depPackageJsonFile;
    try {
        depPackageJsonFile = require.resolve(filePath, {paths: [nodeModulesParentDir]});
    } catch(e) {
        return null;
    }
    try {
        return require(depPackageJsonFile);
    } catch(e) {
        return null;
    }
}

function assert_plugin_found({loadedPlugins, projectRootDir, packageJsonFile}) {
    assert_internal(projectRootDir);
    assert_internal(packageJsonFile);
    const nodeModulesDir = pathModule.resolve(pathModule.dirname(packageJsonFile), "./node_modules");
    assert_usage(
        loadedPlugins.length>0,
        "Project found at `"+projectRootDir+"` but no Reframe plugin found.",
        "You need to add a plugin either by adding it to your `reframe.config.js` or by adding it as a dependency in your `package.json`.",
        "Note that, if the plugin is listed in the `dependencies` field of your `"+packageJsonFile+"`, then it also needs to be installed. In other words, does it exist in `"+nodeModulesDir+"`?",
    );

}
