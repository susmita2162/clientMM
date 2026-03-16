
// Windows temporarily needs this file, https://github.com/module-federation/vite/issues/68

    import {loadShare} from "@module-federation/runtime";
    const importMap = {
      
        "@emotion/cache": async () => {
          let pkg = await import("__mf__virtual/claimsManagementHost__prebuild___mf_0_emotion_mf_1_cache__prebuild__.js");
            return pkg;
        }
      ,
        "@emotion/react": async () => {
          let pkg = await import("__mf__virtual/claimsManagementHost__prebuild___mf_0_emotion_mf_1_react__prebuild__.js");
            return pkg;
        }
      ,
        "@emotion/serialize": async () => {
          let pkg = await import("__mf__virtual/claimsManagementHost__prebuild___mf_0_emotion_mf_1_serialize__prebuild__.js");
            return pkg;
        }
      ,
        "@emotion/styled": async () => {
          let pkg = await import("__mf__virtual/claimsManagementHost__prebuild___mf_0_emotion_mf_1_styled__prebuild__.js");
            return pkg;
        }
      ,
        "@emotion/utils": async () => {
          let pkg = await import("__mf__virtual/claimsManagementHost__prebuild___mf_0_emotion_mf_1_utils__prebuild__.js");
            return pkg;
        }
      ,
        "@mui/material": async () => {
          let pkg = await import("__mf__virtual/claimsManagementHost__prebuild___mf_0_mui_mf_1_material__prebuild__.js");
            return pkg;
        }
      ,
        "react": async () => {
          let pkg = await import("__mf__virtual/claimsManagementHost__prebuild__react__prebuild__.js");
            return pkg;
        }
      ,
        "react-dom": async () => {
          let pkg = await import("__mf__virtual/claimsManagementHost__prebuild__react_mf_2_dom__prebuild__.js");
            return pkg;
        }
      
    }
      const usedShared = {
      
          "@emotion/cache": {
            name: "@emotion/cache",
            version: "11.14.0",
            scope: ["default"],
            loaded: false,
            from: "claimsManagementHost",
            async get () {
              if (false) {
                throw new Error(`Shared module '${"@emotion/cache"}' must be provided by host`);
              }
              usedShared["@emotion/cache"].loaded = true
              const {"@emotion/cache": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "^11.14.0",
              
            }
          }
        ,
          "@emotion/react": {
            name: "@emotion/react",
            version: "11.14.0",
            scope: ["default"],
            loaded: false,
            from: "claimsManagementHost",
            async get () {
              if (false) {
                throw new Error(`Shared module '${"@emotion/react"}' must be provided by host`);
              }
              usedShared["@emotion/react"].loaded = true
              const {"@emotion/react": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "^11.14.0",
              
            }
          }
        ,
          "@emotion/serialize": {
            name: "@emotion/serialize",
            version: "1.3.3",
            scope: ["default"],
            loaded: false,
            from: "claimsManagementHost",
            async get () {
              if (false) {
                throw new Error(`Shared module '${"@emotion/serialize"}' must be provided by host`);
              }
              usedShared["@emotion/serialize"].loaded = true
              const {"@emotion/serialize": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "^1.3.3",
              
            }
          }
        ,
          "@emotion/styled": {
            name: "@emotion/styled",
            version: "11.14.1",
            scope: ["default"],
            loaded: false,
            from: "claimsManagementHost",
            async get () {
              if (false) {
                throw new Error(`Shared module '${"@emotion/styled"}' must be provided by host`);
              }
              usedShared["@emotion/styled"].loaded = true
              const {"@emotion/styled": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "^11.14.1",
              
            }
          }
        ,
          "@emotion/utils": {
            name: "@emotion/utils",
            version: "1.4.2",
            scope: ["default"],
            loaded: false,
            from: "claimsManagementHost",
            async get () {
              if (false) {
                throw new Error(`Shared module '${"@emotion/utils"}' must be provided by host`);
              }
              usedShared["@emotion/utils"].loaded = true
              const {"@emotion/utils": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "^1.4.2",
              
            }
          }
        ,
          "@mui/material": {
            name: "@mui/material",
            version: "7.3.7",
            scope: ["default"],
            loaded: false,
            from: "claimsManagementHost",
            async get () {
              if (false) {
                throw new Error(`Shared module '${"@mui/material"}' must be provided by host`);
              }
              usedShared["@mui/material"].loaded = true
              const {"@mui/material": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "^7.3.7",
              
            }
          }
        ,
          "react": {
            name: "react",
            version: "19.2.4",
            scope: ["default"],
            loaded: false,
            from: "claimsManagementHost",
            async get () {
              if (false) {
                throw new Error(`Shared module '${"react"}' must be provided by host`);
              }
              usedShared["react"].loaded = true
              const {"react": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "^19.2.4",
              
            }
          }
        ,
          "react-dom": {
            name: "react-dom",
            version: "19.2.4",
            scope: ["default"],
            loaded: false,
            from: "claimsManagementHost",
            async get () {
              if (false) {
                throw new Error(`Shared module '${"react-dom"}' must be provided by host`);
              }
              usedShared["react-dom"].loaded = true
              const {"react-dom": pkgDynamicImport} = importMap
              const res = await pkgDynamicImport()
              const exportModule = {...res}
              // All npm packages pre-built by vite will be converted to esm
              Object.defineProperty(exportModule, "__esModule", {
                value: true,
                enumerable: false
              })
              return function () {
                return exportModule
              }
            },
            shareConfig: {
              singleton: true,
              requiredVersion: "^19.2.4",
              
            }
          }
        
    }
      const usedRemotes = [
                {
                  entryGlobalName: "employerGroupSearchApp",
                  name: "employerGroupSearchApp",
                  type: "module",
                  entry: "http://localhost:3003/remoteEntry.js",
                  shareScope: "default",
                }
          ,
                {
                  entryGlobalName: "memberSearchApp",
                  name: "memberSearchApp",
                  type: "module",
                  entry: "http://localhost:3002/remoteEntry.js",
                  shareScope: "default",
                }
          
      ]
      export {
        usedShared,
        usedRemotes
      }
      