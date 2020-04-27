var outputSpan = null;
var maxValueSpan = null;
var minValueSpan = null;
var ratioSpan = null;
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
    minValueSpan = document.getElementById('minValue');
    ratioSpan = document.getElementById('ratio');

    const input = document.getElementById('file');
    input.onchange = async function () {
        const tiff = await GeoTIFF.fromBlob(input.files[0]);
        outputSpan.textContent = 'Got blob, starting to process.';
        processimage(tiff);
    }
});



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
    //console.log(data);
    outputSpan.textContent = 'Data converted to raster';

    const Xcenter = await Math.floor(image.getWidth() / 2);
    const Ycenter = await Math.floor(image.getHeight() / 2);
    const centerIndex = await image.getWidth() * Ycenter;
    const verticalCenterLine = await data[0].slice(centerIndex, centerIndex + image.getWidth());

    const horizontalCenterLine = await getcolumn(data[0], Xcenter, image.getWidth(), image.getHeight());

    updateLine(jnd(horizontalCenterLine), line);
    updateLine(jnd(verticalCenterLine), horizontal_line);
    outputSpan.textContent = slider.value;

    /*
    slider.oninput = function () {
        outputSpan.textContent = this.value;
        updateLine(jnd(repeatSmooth(horizontalCenterLine, this.value)), line);
    }
    */

    plotImage(data, image);
    const min = await Math.min.apply(null, horizontalCenterLine);
    const max = await Math.max.apply(null, horizontalCenterLine);
    minValueSpan.textContent = await min;
    maxValueSpan.textContent = await max;
    ratioSpan.textContent = await Math.round((max / min - 1) * 100) + '%';
    document.getElementById("calculations").style.display = "block";
    document.getElementById("chart-container").style.display = "block";
}


/*
function smooth(array, n) {
    smoothData = new Array(Math.floor(array.length / n));
    var sum = 0;
    var j = 0;
    var c = 0;
    for (let i = 0; i < array.length; i++) {
        sum += array[i];
        c++;
        if (c == n) {
            smoothData[j] = Math.floor(sum / n);
            j++;
            c = 0;
            sum = 0;
        }
    }

    return smoothData;
}
*/

function smooth(values) {
    var smoothed = [];
    for (var i in values) {
        var curr = values[i];
        var prev = smoothed[i - 1] || values[0];
        var next = curr || values[values.length - 1];
        var improved = Number(this.average([prev, curr, next]).toFixed(2));
        smoothed.push(improved);
    }
    return smoothed;
}

function jnd(data) {
    var jnd = new Array(data.length);
    min = Math.min.apply(null, data);
    for (let i = 0; i < data.length; i++) {
        jnd[i] = (Math.pow(data[i] / min, 0.33) - 1) / 0.079; //*65536
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
    var margin = { top: 10, right: 30, bottom: 10, left: 60 },
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

    return { x: x, y: y, path: path, yAxis: yAxis };
}

function updateLine(data, line) {
    line.x.domain([0, data.length]);
    line.y.domain([Math.min.apply(null, data), Math.max.apply(null, data)]);

    //line.xAxis.call(d3.axisBottom(line.x));
    line.yAxis.call(d3.axisLeft(line.y));
    line.path.datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(function (d, i) { return line.x(i) })
            .y(function (d) { return line.y(d) })
        )
}

async function plotImage(data, image) {
    const canvas = document.getElementById("plot");
    const plot = new plotty.plot({
        canvas,
        data: data[0],
        width: image.getWidth(),
        height: image.getHeight(),
        domain: [0, 65536],
        colorScale: "viridis"
    });
    plot.render();
}



