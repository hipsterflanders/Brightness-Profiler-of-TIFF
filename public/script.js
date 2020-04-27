var outputSpan = null;
var slider = null;
window.addEventListener('load', (event) => {
    //console.log(GeoTIFF);
    //console.log(d3);
    slider = document.getElementById("myRange");
    outputSpan = document.getElementById('output');
    outputSpan.textContent = 'started';

    const input = document.getElementById('file');
    input.onchange = async function () {
        const tiff = await GeoTIFF.fromBlob(input.files[0]);
        outputSpan.textContent = 'Got blob, starting to process.';
        processimage(tiff);
        outputSpan.textContent = 'Proccessing ended';
    }
});



// Note: GeoTIFF.Pool will not work

async function processimage(tiff) {
    outputSpan.textContent = 'Getting image from tiff';
    const image = await tiff.getImage(); // by default, the first image is read.
    outputSpan.textContent = 'Image gotten';
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
    outputSpan.textContent = 'Data outputted';

    const Xcenter = await Math.floor(image.getWidth() / 2);
    const Ycenter = await Math.floor(image.getHeight() / 2);
    const centerIndex = await image.getWidth() * Ycenter;
    const verticalCenterLine = await data[0].slice(centerIndex, centerIndex + image.getWidth());

    const horizontalCenterLine = await getcolumn(data[0], Xcenter, image.getWidth(), image.getHeight());


    plotLine(smooth(horizontalCenterLine, 1));
    slider.oninput = function () {
        outputSpan.textContent = this.value;
        plotLine(smooth(horizontalCenterLine, this.value));
    }

    plotImage(data, image);
}



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
/*
function smooth(values, alpha) {
    var weighted = average(values) * alpha;
    var smoothed = [];
    for (var i in values) {
        var curr = values[i];
        var prev = smoothed[i - 1] || values[values.length - 1];
        var next = curr || values[0];
        var improved = Number(this.average([weighted, prev, curr, next]).toFixed(2));
        smoothed.push(improved);
    }
    return smoothed;
}
*/
function smoother(values, n, repeat) {
    smoother = smooth(values, n);
    for (let i = 0; i < repeat; i++) {
        smoother = smooth(smoother, n);
    }
    return smoother;
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
    //console.log(data);

    // define dimensions of graph
    var m = [80, 80, 80, 5]; // margins
    var w = 1000 - m[1] - m[3]; // width
    var h = 400 - m[0] - m[2]; // height

    // X scale will fit all values from data[] within pixels 0-w
    var x = d3.scale.linear().domain([0, data.length]).range([0, w]);
    // Y scale will fit values from 0-10 within pixels h-0 (Note the inverted domain for the y-scale: bigger is up!)
    var y = d3.scale.linear().domain([Math.min.apply(null, data), Math.max.apply(null, data)]).range([h, 0]);
    // automatically determining max range can work something like this
    // var y = d3.scale.linear().domain([0, d3.max(data)]).range([h, 0]);

    // create a line function that can convert data[] into x and y points
    var line = d3.svg.line()
        // assign the X function to plot our line as we wish
        .x(function (d, i) {
            // return the X coordinate where we want to plot this datapoint
            return x(i);
        })
        .y(function (d) {
            // return the Y coordinate where we want to plot this datapoint
            return y(d);
        })

    // Add an SVG element with the desired dimensions and margin.
    var graph = d3.select("#graph").append("svg:svg")
        .attr("width", w + m[1] + m[3])
        .attr("height", h + m[0] + m[2])
        .append("svg:g")
        .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

    // create yAxis
    var xAxis = d3.svg.axis().scale(x).tickSize(-h).tickSubdivide(true);
    // Add the x-axis.
    graph.append("svg:g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + h + ")")
        .call(xAxis);


    // create left yAxis
    var yAxisLeft = d3.svg.axis().scale(y).ticks(4).orient("right");
    // Add the y-axis to the left
    graph.append("svg:g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + w + ",0)")
        .call(yAxisLeft);

    // Add the line by appending an svg:path element with the data line we created above
    // do this AFTER the axes above so that the line is above the tick-lines
    graph.append("svg:path").attr("d", line(data));
}

function updateLine(data){
    
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



