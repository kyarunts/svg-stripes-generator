const glob = require("glob");
const tools = require('simple-svg-tools');
const fs = require('fs-extra');

const DEFAULT = {
    src: null,
    dest: null,
    removeAttrs: ['fill', 'stroke', 'vector-effect', 'xmlns:default'],
    prefix: '',
    svgAttributes: {
        class: 'test-icons',
        style: 'display: none;',
        x: '0px',
        y: '0px',
    },
    symbolAttributes: {
        style: 'fill: currentColor',
    }
}

module.exports = (options) => {
    options = Object.assign({}, DEFAULT, options);
    const regexps = getRegexps(options.removeAttrs);

    getFiles(options.src).then(files => {
        getSymbols(files).then(symbols => {
            writeFile(
                options.dest, 
                createSvgElement(options.svgAttributes, symbols.join(' '))
            );
        });
    });

    function writeFile(dest, data) {
        if (!dest) throw 'Destination file is not provided';
        fs.writeFile(dest, data, (err) => {
            if (err) throw 'something went wrong';
            console.log('\x1b[36m%s\x1b[0m', '🦉 Stripes generated!!!');
        });
    }

    function getRegexps(removeAttrs) {
        return removeAttrs.map(attr => {
            return new RegExp(`${attr}=".*?"`, 'g');
        });
    }

    function getFiles(src) {
        return new Promise((resolve, reject) => {
            if (!src) reject('Source not provided');
            src = src.endsWith('.svg') ? src : (src.endsWith('/') ? src + '*.svg' : src + '/*.svg');
            glob(src, (err, files) => {
                if (err) reject('Could not get files');
                resolve(files);
            });
        });
    }

    function getSymbols(files) {
        const symbols = [];
        return new Promise((resolve, reject) => {
            if (!files) reject('Files are not provided');

            files.forEach((file) => {
                tools.ImportSVG(file).then(svg => {
                    tools.SVGO(svg).then(svg => {
                        tools.Tags(svg).then(svg => {
                            symbols.push(generateSymbol(
                                options.symbolAttributes,
                                options.prefix ? `${options.prefix}-${getIconName(file)}` : getIconName(file),
                                svg.$svg(':root').get(0).attribs.viewBox,
                                removeAttributes(svg.getBody())
                            ));
                            if (symbols.length === files.length) resolve(symbols);
                        })
                    });
                })
            });
        });
    }

    function getIconName(fileName) {
        const splitted = fileName.split('/');
        return splitted[splitted.length - 1].split('.svg')[0];
    }

    function createSvgElement(attributes, body) {
        return `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${getAttributesAsString(attributes)}>${body}</svg>`;
    }

    function removeAttributes(data) {
        return regexps.reduce((initial, current) => {
            return initial = initial.replace(current, '');
        }, data);
    }

    function generateSymbol(attributes, iconId, viewBox, data) {
        return `<symbol id="${iconId}" viewBox="${viewBox}" ${getAttributesAsString(attributes)}>${data}</symbol>`;
    }
    
    function getAttributesAsString(attributes) {
        return Object.keys(attributes).reduce((initial, current) => {
            return initial += `${current}="${attributes[current]}" `;
        }, '');
    }
}
