var outputSpan = null;
var maxValueSpan = null;
var slider = null;
var line = null;
var horizontal_line = null;
window.addEventListener('load', (event) => {
    line = plotLine([0, 1]);
    horizontal_line = plotLine([0, 1]);
    //console.log(GeoTIFF);
    //console.log(d3);
    slider = document.getElementById("myRange");
    outputSpan = document.getElementById('output');
    outputSpan.textContent = 'load image to start';
    maxValueSpan = document.getElementById('maxValue');

    /*
    const input = document.getElementById('file');
    input.onchange = async function () {
        const tiff = await GeoTIFF.fromBlob(input.files[0]);
        outputSpan.textContent = 'Got blob, starting to process.';
        processimage(tiff);
    }
    */
    // Setup listeners.
    var dropZone = document.getElementById('drop');
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('drop', handleFileSelect, false);

    var fileInput = document.getElementById('files');
    fileInput.addEventListener('change', handleFileSelect, false);
});

async function handleTifF(file) {
    const tiff = await GeoTIFF.fromBlob(file);
    outputSpan.textContent = 'Got blob, starting to process.';
    processimage(tiff);
}

async function handleCr2(f) {
    console.log('Is cr2');
    var reader = new FileReader();

    reader.onload = (function (o) {
        return function (e) {
            // Get the image file as a buffer
            var buf = new Uint8Array(e.currentTarget.result);
            /*
            // Get the RAW metadata
            var metadata = dcraw(buf, { verbose: true, identify: true }).split('\n').filter(String);
            console.log(metadata);
*/

            outputSpan.textContent = 'Converting to TIFF...';
            // Convert to TIFF
            const tiffFile = dcraw(buf, { exportAsTiff: true, use16BitLinearMode: true, useExportMode: true });
            outputSpan.textContent = 'TIFF conversion to arraybuffer completed, converting to blob...';

            tiffBlob = new Blob([tiffFile]);
            outputSpan.textContent = 'TIFF converted to blob';
            handleTifF(tiffBlob);

        };
    })(f);

    reader.readAsArrayBuffer(f);
}

function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    try {
        var files = evt.dataTransfer.files;
    } catch (e) {
        var files = evt.target.files;
    }

    const filetype = files[0].name.split('.').pop();
    if (filetype == 'TIF') {
        outputSpan.textContent = 'TIFF file detected, starting to process...';
        handleTifF(files[0]);
    } else if (filetype == 'CR2') {
        outputSpan.textContent = 'CR2 file detected, starting to process...';
        handleCr2(files[0]);
    } else {
        alert('Cannot open ' + filetype + ' files. Use CR2 or TIFF!');
    }
}

function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy';
}

// Note: GeoTIFF.Pool will not work

async function processimage(tiff) {
    outputSpan.textContent = 'Getting image from tiff';
    const image = await tiff.getImage(); // by default, the first image is read.
    outputSpan.textContent = 'Image loaded';
    /*
    const width = image.getWidth();
    const height = image.getHeight();
    const tileWidth = image.getTileWidth();
    const tileHeight = image.getTileHeight();
    const samplesPerPixel = image.getSamplesPerPixel();
    console.log({ image: image, width: width, height: height, tileHeight: tileHeight, samplesPerPixel: samplesPerPixel });
    */
    const data = await image.readRasters();

    outputSpan.textContent = 'Data converted to raster';

    const Xcenter = await Math.floor(image.getWidth() / 2);
    const Ycenter = await Math.floor(image.getHeight() / 2);
    const centerIndex = await image.getWidth() * Ycenter;
    const verticalCenterLine = await data[0].slice(centerIndex, centerIndex + image.getWidth());
    const horizontalCenterLine = await getcolumn(data[0], Xcenter, image.getWidth(), image.getHeight());

    const horJND = jnd(horizontalCenterLine);
    const vertJND = jnd(verticalCenterLine);

    updateLine(horJND, line);
    updateLine(vertJND, horizontal_line);

    /*
    slider.oninput = function () {
        outputSpan.textContent = this.value;
        updateLine(jnd(repeatSmooth(horizontalCenterLine, this.value)), line);
    }
    */

    plotImage(data[0], image.getWidth(), image.getHeight());
    const max = await Math.round(Math.max.apply(null, horJND)*10)/10;
    maxValueSpan.textContent = await max+'%';
    document.getElementById("calculations").style.display = "block";
    document.getElementById("chart-container").style.display = "block";
}

function jnd(data) {
    var jnd = new Array(data.length);
    min = Math.min.apply(null, data);
    for (let i = 0; i < data.length; i++) {
        jnd[i] = (Math.pow(data[i] / min, 0.33) - 1)*100;
    }
    return jnd;
}

function scaledJnd(data) {
    var jnd = new Array(data.length);
    min = Math.min.apply(null, data);
    for (let i = 0; i < data.length; i++) {
        jnd[i] = (Math.pow(data[i] / min, 0.33) - 1) / 0.079 * 65536;
    }
    return jnd;
}

var smoothedArrays = [];

function repeatSmooth(values, repeat) {
    if (smoothedArrays.length == 0) {
        smoothedArrays.push(values);
    }
    smoother = smooth(values);
    for (let i = smoothedArrays.length; i < repeat * 5; i++) {
        smoothedArrays[i] = smooth(smoothedArrays[i - 1]);
    }
    return smoothedArrays[repeat * 5];
}

function average(data) {
    var sum = data.reduce(function (sum, value) {
        return sum + value;
    }, 0);
    var avg = sum / data.length;
    return avg;
}

function getcolumn(array, column, width, height) {
    var colArray = new Array(height);
    var j = column;
    for (let i = 0; i < height; i++) {
        colArray[i] = array[j];
        j += width;
    }
    return colArray;
}

function plotLine(data) {
    // set the dimensions and margins of the graph
    var margin = { top: 10, right: 0, bottom: 10, left: 30 },
        width = 1000 - margin.left - margin.right,
        height = 200 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select("#graph")
        .append("svg")
        .attr("viewBox", `0 0 1000 200`)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Add X axis
    var x = d3.scaleLinear()
        .domain([0, data.length])
        .range([0, width]);
    /*
    var xAxis = svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));
        */

    // Add Y axis
    var y = d3.scaleLinear()
        .domain([Math.min.apply(null, data), Math.max.apply(null, data)])
        .range([height, 0]);

    var dangerZone = svg.append("rect")
        .attr('fill', 'rgb(255, 126, 126)')
        .attr('width', width)
        .attr('height', 0)
        .attr('x', 0)
        .attr('y', 0);

    var yAxis = svg.append("g")
        .call(d3.axisLeft(y));


    // Add the line
    var path = svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(function (d, i) { return x(i) })
            .y(function (d) { return y(d) })
        )

    return { x: x, y: y, path: path, yAxis: yAxis, dangerZone: dangerZone };
}

function updateLine(data, line) {
    line.x.domain([0, data.length]);
    const min = Math.min.apply(null, data);
    const max = Math.max.apply(null, data);
    line.y.domain([min, max]);

    //line.xAxis.call(d3.axisBottom(line.x));
    line.yAxis.call(d3.axisLeft(line.y));
    line.path.datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(function (d, i) { return line.x(i) })
            .y(function (d) { return line.y(d) })
        );
    line.dangerZone.attr('height', (max-7.9) > 0 ? line.y(7.9) : 0);
}

async function plotImage(data, width, height) {
    const canvas = document.getElementById("plot");
    const plot = new plotty.plot({
        canvas,
        data: data,
        width: width,
        height: height,
        domain: [0, 65536],
        colorScale: "viridis"
    });
    plot.render();
}



