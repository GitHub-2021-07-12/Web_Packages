import * as PathManager from 'path';


export class Bundler {
    static _buildPlugin = {
        name: 'buildPlugin',

        setup(build) {
            build.onLoad(
                {filter: /.*/},

                async function ({path}) {
                    let contents = await Bun.file(path).text();
                    contents = contents.replaceAll('\r', '');

                    if (path.endsWith('.js')) {
                        contents = contents.replaceAll('\\n', '\0');

                        if (~contents.search('_cssUrl = true')) {
                            contents = `
                                import css from '${path.replace('.js', '.css')}' with {type: 'text'};
                                ${contents}
                            `;
                            contents = contents.replace('_cssUrl = true', '_css = css');
                        }

                        if (~contents.search('_htmlUrl = true')) {
                            contents = `
                                import html from '${path.replace('.js', '.html')}' with {type: 'text'};
                                ${contents}
                            `;
                            contents = contents.replace('_htmlUrl = true', '_html = html');
                        }
                    }

                    return {contents};
                },
            );

            build.onResolve(
                {filter: /.*\.(?:css|html|js)/},

                function ({path}) {
                    path = path.replace(process.stdin.path, '');
                    path = Bundler.resolvePath(path);

                    return {path};
                },
            );
        },
    };

    static _extractSvgIconRecords = (iconSize, iconType) => {
        let elementsGroup = document.querySelectorAll(`#${iconSize} > [id^='${iconType}'] > g`);
        let svgIconRecords = [];

        for (let elementGroup of elementsGroup) {
            svgIconRecords.push({
                name: elementGroup.id.replace(/_\d+$/, ''),
                paths: [...elementGroup.querySelectorAll('path')].map((elementPath) => elementPath.getAttribute('d')),
            });
        }

        return svgIconRecords;
    };

    static _svgIconProps = {
        sizes: ['size16', 'size24'],

        types: {
            fill: ['fill'],
            stroke: ['stroke1', 'stroke2'],
        },
    };


    static appDir = '/Files/Web/Apps/App/';
    static appDirAliasRegExp = /.*?\/@\//;
    static bundleNamePostfix = '.bundle';
    static entryPointsCss = {};
    static entryPointsHtml = {};
    static entryPointsJs = {};
    static entryPointsSvg = {};
    static minimizationBlank = true;
    static minimizationIdentifier = false;
    static minimizationSyntax = false;
    static pathStrictPrefix = '!';
    static rootDir = '/Files/Web/';
    static rootDirAliasRegExp = /.*?\/\$\//;
    static svgBundleTemplatePath = '/Packages/Generic/Bun/Units/Bundler/BundleTemplate.svg';
    static svgNumberPrecision = 5;


    static _createBundlePath(inputPath, outputPath) {
        return /\..+$/.test(outputPath) ? outputPath : `${outputPath}/${PathManager.basename(inputPath).replace('.', `${this.bundleNamePostfix}.`)}`;
    }

    static _vacuum(string) {
        if (this.minimizationBlank) {
            string = string
                .replace(/(?<=^|\n)\s*\/\/.*\r?\n/g, '')
                .replace(/\/\*[\S\s]*?\*\//g, '')
                .replace(/<!--[\S\s]*?-->/g, '')
                // .replace(/(?<=[(,:;>{}])\s+|\s+(?=\/>|[(),;<>{}])/g, '')
                .replaceAll('\\x00', '\\n')
                .replace(/\s+/g, ' ')
                .trim()
            ;
        }

        return string;
    }


    static async bundleCss(inputPath, outputPath = '') {
        inputPath = this.resolvePath(inputPath);
        outputPath = outputPath ? this.resolvePath(outputPath) : PathManager.dirname(inputPath);

        let {outputs: [output]} = await Bun.build({
            entrypoints: [inputPath],
            external: ['*'],
            minify: this.minimizationBlank,
            naming: `[name]${this.bundleNamePostfix}.[ext]`,
            plugins: [this._buildPlugin],
            target: 'bun',
        });

        let contents = await output.text();
        contents = this._vacuum(contents);
        await Bun.write(this._createBundlePath(inputPath, outputPath), contents);
    }

    static async bundleHtml(inputPath, outputPath = '') {
        inputPath = this.resolvePath(inputPath);
        outputPath = outputPath ? this.resolvePath(outputPath) : PathManager.dirname(inputPath);

        let contents = await Bun.file(inputPath).text();
        contents = this._vacuum(contents);
        await Bun.write(this._createBundlePath(inputPath, outputPath), contents);
    }

    static async bundleHtmlStandalone() {

    }

    static async bundleJs(inputPath, outputPath = '') {
        inputPath = this.resolvePath(inputPath);
        outputPath = outputPath ? this.resolvePath(outputPath) : PathManager.dirname(inputPath);

        let {outputs: [output]} = await Bun.build({
            drop: ['console', 'debugger'],
            entrypoints: [inputPath],
            external: ['*'],
            plugins: [this._buildPlugin],

            loader: {
                '.css': 'text',
                '.html': 'text',
            },

            minify: {
                identifiers: this.minimizationIdentifier,
                syntax: this.minimizationSyntax,
                whitespace: this.minimizationBlank,
            },
        });

        let contents = await output.text();
        contents = this._vacuum(contents);
        await Bun.write(this._createBundlePath(inputPath, outputPath), contents);
    }

    static async bundleSvg(inputPath, outputPath) {
        inputPath = this.resolvePath(inputPath);
        outputPath = outputPath ? this.resolvePath(outputPath) : PathManager.dirname(inputPath);

        let contents = await Bun.file(this.resolvePath(this.svgBundleTemplatePath)).text();
        let spaceNeedful = `\n${' '.repeat(28)}`;
        let spaceNeedlesRegExp1 = /(?<=\n)\s{12}/g;
        let spaceNeedlesRegExp2 = /(?<=\n)\s{16}/g;
        using webView = new Bun.WebView();
        await webView.navigate(`file:///${inputPath}`);

        for (let svgIconSize of this._svgIconProps.sizes) {
            for (let [svgIconTypeInput, svgIconTypesOutput] of Object.entries(this._svgIconProps.types)) {
                let svgIconRecords = await webView.evaluate(`(${this._extractSvgIconRecords})('${svgIconSize}', '${svgIconTypeInput}')`);

                if (!svgIconRecords.length) continue;

                let elementsSvgHtml = {};
                let elementsSymbolHtml = [];

                for (let svgIconRecord of svgIconRecords) {
                    let elementSymbolId = `symbol_${svgIconRecord.name}_${svgIconSize}_${svgIconTypeInput}`;

                    for (let i = 0; i < svgIconRecord.paths.length; i++) {
                        svgIconRecord.paths[i] = svgIconRecord.paths[i].replace(
                            /(?:\d+\.\d+|\d+\.|\.\d+|\d+)(?:e[+-]?\d+)?/gi,
                            (number) => +(+number).toPrecision(this.svgNumberPrecision),
                        );
                    }

                    elementsSymbolHtml.push(`
                        <symbol id='${elementSymbolId}'>
                            ${svgIconRecord.paths.map((svgIconPath) => `<path d='${svgIconPath}'/>`).join(spaceNeedful)}
                        </symbol>
                    `);

                    for (let svgIconTypeOutput of svgIconTypesOutput) {
                        elementsSvgHtml[svgIconTypeOutput] ??= [];
                        elementsSvgHtml[svgIconTypeOutput].push(`
                            <svg id='${svgIconRecord.name}_${svgIconSize}_${svgIconTypeOutput}'>
                                <use href='#${elementSymbolId}'/>
                            </svg>
                        `);
                    }
                }

                let htmlRewriter = new HTMLRewriter().on(
                    `defs.${svgIconSize} > .${svgIconTypeInput}`,
                    {
                        element(element) {
                            element.append(elementsSymbolHtml.join('').replace(spaceNeedlesRegExp1, ''), {html: true});
                        },
                    },
                );

                for (let svgIconTypeOutput of svgIconTypesOutput) {
                    htmlRewriter.on(
                        `svg.${svgIconSize} > .${svgIconTypeOutput}`,
                        {
                            element(element) {
                                element.append(elementsSvgHtml[svgIconTypeOutput].join('').replace(spaceNeedlesRegExp2, ''), {html: true});
                            },
                        },
                    );
                }

                contents = htmlRewriter.transform(contents);
            }
        }

        contents = this._vacuum(contents);
        await Bun.write(this._createBundlePath(inputPath, outputPath), contents);
    }

    static resolvePath(path) {
        if (!path) return path;

        if (path.startsWith(this.pathStrictPrefix)) {
            path = path.replace(this.pathStrictPrefix, '');
        }
        else if (PathManager.isAbsolute(path)) {
            path = path
                .replace(this.appDirAliasRegExp, `${this.appDir}/`)
                .replace(this.rootDirAliasRegExp, `${this.rootDir}/`)
            ;
            path = PathManager.join(this.rootDir, PathManager.relative(this.rootDir, path).replace(/^(?:\.+.)*/g, ''));
        }

        return PathManager.resolve(path).replaceAll('\\', '/');
    }
}
