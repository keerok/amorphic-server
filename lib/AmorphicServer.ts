// Internal modules
let AmorphicContext = require('./AmorphicContext');
let Logger = require('./utils/logger');
let logMessage = Logger.logMessage;
let uploadRouter = require('./routers/uploadRouter').uploadRouter;
let initializePerformance = require('./utils/initializePerformance').initializePerformance;
let amorphicEntry = require('./amorphicEntry').amorphicEntry;
let postRouter = require('./routers/postRouter').postRouter;
let downloadRouter = require('./routers/downloadRouter').downloadRouter;
let router = require('./routers/router').router;
let generateDownloadsDir = require('./utils/generateDownloadsDir').generateDownloadsDir;
let nonObjTemplatelogLevel = 1;


import * as expressSession from 'express-session';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as fs from 'fs';
import * as compression from 'compression';

const routesRelativePath = '/js/routes/';
const middlewaresRelativePath = '/js/middlewares/';
/**
 * @TODO: seperate out amorphic shit to defaultRouter (express.Router) to seperate out middleware
 */
export class AmorphicServer {
    app: express.Express;


    /**
     * @static
     * @param {string} appDirectory is the directory wher the app is located 
     * @param {AmorphicServer} server
     * @returns
     * @memberof AmorphicServer
     */
    static setupStatics(appDirectory: string, server: AmorphicServer) {
        //   TODO: Do we actually need these checks?
        let rootSuperType, rootSemotus, rootBindster;

        if (fs.existsSync(`${appDirectory}/node_modules/supertype`)) {
            rootSuperType = appDirectory;
        }
        else {
            rootSuperType = __dirname;
        }

        if (fs.existsSync(`${appDirectory}/node_modules/semotus`)) {
            rootSemotus = appDirectory;
        }
        else {
            rootSemotus = __dirname
        }

        if (fs.existsSync(`${appDirectory}/node_modules/amorphic-bindster`)) {
            rootBindster = appDirectory;
        }
        else {
            rootBindster = __dirname;
        }

        server.app.use('/modules/', express.static(`${appDirectory}/node_modules`))
            .use('/bindster/', express.static(`${rootBindster}/node_modules/amorphic-bindster`))
            .use('/amorphic/', express.static(`${appDirectory}/node_modules/amorphic`))
            .use('/common/', express.static(`${appDirectory}/apps/common`))
            .use('/supertype/', express.static(`${rootSuperType}/node_modules/supertype`))
            .use('/semotus/', express.static(`${rootSemotus}/node_modules/semotus`));

        return server;
    }

    /**
    * Purpose unknown
    *
    * @param {unknown} preSessionInject unknown
    * @param {unknown} postSessionInject unknown
    * @param {unknown} appList unknown
    * @param {unknown} appStartList unknown
    * @param {unknown} appDirectory unknown
    * @param {unknown} sessionRouter unknown
    */
    static createServer(preSessionInject, postSessionInject, appList, appStartList, appDirectory, sessionConfig) {

        let controllers = {};
        let sessions = {};

        let amorphicOptions = AmorphicContext.amorphicOptions;
        let mainApp = amorphicOptions.mainApp;
        let appContext = AmorphicContext.appContext;
        let appConfig = AmorphicContext.applicationConfig[mainApp];
        let reqBodySizeLimit = appConfig.reqBodySizeLimit || '50mb';
        let server = new AmorphicServer(express());

        const downloads = generateDownloadsDir();

        if (amorphicOptions.compressXHR) {
            server.app.use(compression());
        }

        if (preSessionInject) {
            preSessionInject.call(null, server.app);
        }

        let appPaths: string[] = [];

        /**
         * Deprecated(?) because we only run app at a time
         */
        for (let appName in appList) {
            if (appStartList.includes(appName)) {

                let appPath = `${appDirectory}/${appList[appName]}/public`;
                appPaths.push(appPath);

                server.app.use(`/${appName}/`, express.static(appPath, { index: 'index.html' }));

                if (appName === mainApp) {
                    server.app.use('/', express.static(appPath, { index: 'index.html' }));
                }

                logMessage(`${appName} connected to ${appPath}`);
            }
        }

        /**
         *  Setting up the different middlewares
         */
        let cookieMiddleware = cookieParser();
        let expressSesh = expressSession(sessionConfig);
        let bodyLimitMiddleWare = express.json({
            limit: reqBodySizeLimit
        });

        let urlEncodedMiddleWare = express.urlencoded({
            extended: true
        });

        server.app.use(initializePerformance);
        this.setupStatics(appDirectory, server);
        server.app.use(cookieMiddleware)
            .use(expressSesh)
            .use(uploadRouter.bind(this, downloads))
            .use(downloadRouter.bind(this, sessions, controllers, nonObjTemplatelogLevel))
            .use(bodyLimitMiddleWare)
            .use(urlEncodedMiddleWare)
            .use(postRouter.bind(this, sessions, controllers, nonObjTemplatelogLevel))
            .use(amorphicEntry.bind(this, sessions, controllers, nonObjTemplatelogLevel));

        if (postSessionInject) {
            postSessionInject.call(null, server.app);
        }

        server.app.use(router.bind(this, sessions, nonObjTemplatelogLevel, controllers));

        appContext.server = server.app.listen(amorphicOptions.port);
    }

    /**
     * To be implemented
     */
    registerAppMiddlewares() {
        
    }

    // async registerAppsRoutes(appPaths: string[]) {
    //     let promises = appPaths.map(async appPath => {
    //         let router: express.Router = express.Router();
    //         const routes: {[routeExport: string]: routeObject: any} = await import(`${appPath}${routesRelativePath}`);
    //         // what are the types and values of Routes (key, value) dictionary. Key is what type and what value, value is what type and what value
            
    //         Object.keys(routes).forEach(key => {
                
            
    //         });
    //     });     
    //     await promises;   
    // }

    /**
    * @TODO: make this a proper class
    *
    * @param {express.Express} app Express server
    *
    **/
    constructor(app: express.Express) {
        this.app = app;
        this.app
    }
}