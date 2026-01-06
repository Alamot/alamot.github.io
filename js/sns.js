// Author: Alamot

// --- Configuration ---
const GRID_SIZE = 6; // Simulates 2 dice (6x6)
const INITIAL_SCORES = [2, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 7, 7, 8];

// --- State ---
let round = 0;
let preys = [];
let predators = [];
let n_preys = [];
let n_predators = [];
let gameLog = document.getElementById('game-log');

// --- Classes ---
class Prey {
    constructor(x, y, score) {
        this.id = Math.random().toString(36).substr(2, 9);            
        this.x = x;
        this.y = y;
        this.score = Math.max(0, score); // Camouflage
        this.eaten = false;
    }
}

class Predator {
    constructor(x, y, score, birthRound) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.x = x;
        this.y = y;
        this.score = Math.max(0, score); // Visual Acuity
        this.birthRound = birthRound;            
        this.fedThisRound = false;
    }
}

// --- Core Logic ---
function initGame() {
    // Clear variables
    round = 0;
    preys = [];
    predators = [];
    n_preys = [];
    n_predators = [];
    // Clear UI
    document.getElementById('stats-body').innerHTML = '';
    gameLog.innerHTML = '<div class="log-entry">Game Reset. Initializing population...</div>';
    // Init Populations
    for (const score of INITIAL_SCORES) {
        x = rollDice(); y = rollDice();
        preys.push(new Prey(x, y, score));
        x = rollDice(); y = rollDice();
        predators.push(new Predator(x, y, score, 0));
    }
    updateBoard();
    updateStats();
    updateGraphs();
    log("Ready to begin. Entities placed.");
}

function rollDice() {
    // Returns 0 to 5 (representing 1-6 on dice)
    return Math.floor(Math.random() * GRID_SIZE);
}

function log(msg, isHeader = false) {
    const div = document.createElement('div');
    div.className = isHeader ? 'log-round' : 'log-entry';
    div.textContent = msg;
    gameLog.prepend(div);
}

function nextRound() {
    round++;
    log(`--- Round ${round} ---`, true);
    // 1. Move everyone
    moveEntities();
    // 2. Predation (Conflict Resolution)
    handlePredation();
    // 3. Predator Reproduction & Starvation
    updatePredators();
    // 4. Prey Reproduction
    updatePrey();
    // 5. Cleanup & Render
    updateBoard(); 
    // Update stats
    updateStats();  
    // Update graphs       
    updateGraphs();
    // Check extinction
    if(preys.length === 0 && predators.length === 0) {
        log("Extinction Event! Everyone is dead.");
    } else if (preys.length === 0) {
        log("Prey are extinct. Predators will starve.");
    } else if (predators.length === 0) {
        log("Predators are extinct. Prey will overpopulate.");
    }
}

function moveEntities() {
    preys.forEach(p => { p.x = rollDice(); p.y = rollDice(); p.eaten = false; });
    predators.forEach(p => { p.x = rollDice(); p.y = rollDice(); p.fedThisRound = false; });
}

function handlePredation() {
    // Group by coordinates
    const grid = {}; // Key: "x,y", Value: { preys: [], preds: [] }
    // Populate grid map
    preys.forEach(p => {
        const key = `${p.x},${p.y}`;
        if(!grid[key]) grid[key] = { preys: [], preds: [] };
        grid[key].preys.push(p);
    });
    predators.forEach(p => {
        const key = `${p.x},${p.y}`;
        if(!grid[key]) grid[key] = { preys: [], preds: [] };
        grid[key].preds.push(p);
    });
    // Resolve conflicts in each square
    for (const key in grid) {
        const cell = grid[key];
        if (cell.preds.length > 0 && cell.preys.length > 0) {            
            // Rule: Predator with higher acuity sees first.
            // Sort Preds High -> Low
            cell.preds.sort((a, b) => b.score - a.score);
            // Rule: Prey with lower camo seen first.
            // Sort Prey Low -> High
            cell.preys.sort((a, b) => a.score - b.score);
            // Match up
            // A predator can only eat one prey.
            let preyIndex = 0;            
            for (let i = 0; i < cell.preds.length; i++) {
                const pred = cell.preds[i];                
                // If we ran out of prey
                if (preyIndex >= cell.preys.length) break;
                const prey = cell.preys[preyIndex];
                // Determine outcome
                let eats = false;
                if (pred.score > prey.score) {
                    eats = true;
                    log(`Pred(${pred.score}) ate Prey(${prey.score}) at [${key}]`);
                } else if (pred.score < prey.score) {
                    eats = false;
                    log(`Pred(${pred.score}) missed Prey(${prey.score}) at [${key}]`);
                } else {
                    // Tie: Flip coin
                    eats = Math.random() < 0.5;
                    log(`Tie at [${key}]. Pred ${eats ? 'won' : 'lost'}.`);
                }
                if (eats) {
                    pred.fedThisRound = true;
                    prey.eaten = true;
                    preyIndex++; // Move to next vulnerable prey
                }
                // If pred fails to eat this specific prey, can it try another? 
                // The rules imply 1-on-1 interaction based on sorting. 
                // "The predator with higher acuity will see prey first... prey with lower camouflage seen."
                // We assume one attempt per predator per round.
            }
        }
    }
}

function updatePredators() {
    const nextGenPreds = [];
    predators.forEach(p => {
        if (p.fedThisRound) {
            // Rule: Reproduce (Parent dies, 2 offspring created)
            // One +1, One -1
            nextGenPreds.push(new Predator(p.x, p.y, p.score + 1, round));
            nextGenPreds.push(new Predator(p.x, p.y, p.score - 1, round));
        } else {
            // Check Starvation
            // "If a predator doesn't eat for 2 rounds, it starves."
            // E.g. Born Round 0. 
            // Rd 1: Age 1. No eat.
            // Rd 2: Age 2. No eat -> Die.
            const age = round - p.birthRound;
            if (age >= 2) {
                log(`Predator (Score ${p.score}) starved.`);
            } else {
                nextGenPreds.push(p); // Survives
            }
        }
    });

    predators = nextGenPreds;
}

function updatePrey() {
    const survivingPrey = preys.filter(p => !p.eaten);
    const nextGenPrey = [];
    // Group survivors by location to check overcrowding
    const gridCounts = {};
    survivingPrey.forEach(p => {
        const key = `${p.x},${p.y}`;
        gridCounts[key] = (gridCounts[key] || 0) + 1;
    });
    survivingPrey.forEach(p => {
        const key = `${p.x},${p.y}`;
        const countOnSquare = gridCounts[key];
        if (countOnSquare > 1) {
            // Rule: Limited resources. Survive but NO reproduction.
            // Keep parent.
            nextGenPrey.push(p);
        } else {
            // Rule: Reproduce. Parent dies, 2 offspring (+1/-1).
            nextGenPrey.push(new Prey(p.x, p.y, p.score + 1));
            nextGenPrey.push(new Prey(p.x, p.y, p.score - 1));
        }
    });
    preys = nextGenPrey;
}

function updateBoard() {
    const board = document.getElementById('board');
    board.innerHTML = ''; // clear
    // Create Grid Cells
    for(let y=0; y<GRID_SIZE; y++) {
        for(let x=0; x<GRID_SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';            
            // Add Coord label
            const label = document.createElement('span');
            label.className = 'cell-coord';
            label.textContent = `${x+1},${y+1}`; // 1-based index for display
            cell.appendChild(label);
            // Find entities here
            const cellPreys = preys.filter(p => p.x === x && p.y === y);
            const cellPreds = predators.filter(p => p.x === x && p.y === y);
            cellPreys.forEach(p => {
                const el = document.createElement('div');
                el.className = 'entity prey';
                el.textContent = '🐇';           
                el.title = `Prey | Camouflage: ${p.score}`;
                const el2 = document.createElement('span');
                el2.className = 'overlay';
                el2.textContent = p.score;  
                cell.appendChild(el);
                el.appendChild(el2);
            });
            cellPreds.forEach(p => {
                const el = document.createElement('div');
                el.className = 'entity predator';
                el.textContent = '🦅';
                el.title = `Predator | Visual acuity: ${p.score} | Born Round: ${p.birthRound}`;
                const el2 = document.createElement('span');
                el2.className = 'overlay';
                el2.textContent = p.score;                    
                //const el3 = document.createElement('span');
                //el3.className = 'birth-overlay';
                //el3.textContent = p.birthRound;                       
                cell.appendChild(el);
                el.appendChild(el2);
                //el.appendChild(el3);
            });
            board.appendChild(cell);
        }
    }
}

function updatePopulationGraph() {
    // Clear the old graph
    d3.select("#population").select("svg").remove();
    // Set the dimensions and margins of the graph
    const margin = {top: 20, right: 20, bottom: 30, left: 40};
    const width = 380 - margin.left - margin.right;
    const height = 150 - margin.top - margin.bottom;        
    // Append the svg object to the body of the page
    const svg = d3.select("#population")
              .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
              .append("g")
                .attr("transform",
                      "translate(" + margin.left + "," + margin.top + ")");
    // Set X axis         
    const max_length = d3.max([n_preys.length, n_predators.length]);
    const x = d3.scaleLinear().domain([0, max_length]).nice().range([0, width]);  
    const xAxis = d3.axisBottom(x).ticks(Math.min(max_length, 10)).tickFormat(d3.format("d"));          
    const xAxisGroup = svg.append("g").attr("transform", "translate(0," + height + ")").call(xAxis);        
    xAxisGroup.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)          // Center it horizontally
        .attr("y", 30)                 // Move it below the axis line
        .attr("fill", "black")         // Text needs a fill to be visible
        .attr("font-weight", "bold")
        .style("text-anchor", "middle")
        .text("Rounds");
    // Set Y axis
    const combined_max = d3.max([...n_preys, ...n_predators]);
    const y = d3.scaleLinear().domain([0, combined_max]).nice().range([ height, 0 ]);
    const yAxisGroup = svg.append("g").call(d3.axisLeft(y));
    yAxisGroup.append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)") // Rotate the text
      .attr("x", -height / 2)           // X is now vertical distance due to rotation
      .attr("y", -30)                  // Y is now horizontal distance
      .attr("fill", "black")
      .attr("font-weight", "bold")
      .style("text-anchor", "middle")
      .text("Population");
    // Set the Line Generator
    const line = d3.line()
      .x((d, i) => x(i)) // Use the index 'i' for the horizontal position
      .y(d => y(d))      // Use the value 'd' for the vertical position
      .curve(d3.curveCardinal);
    // Add the two lines
    svg.append("path")
      .datum(n_preys)
      .attr("fill", "none")
      .attr("stroke", "green")
      .attr("stroke-width", 1.5)
      .attr("d", line);          
    svg.append("path")
      .datum(n_predators)
      .attr("fill", "none")
      .attr("stroke", "red")
      .attr("stroke-width", 1.5)
      .attr("d", line);          
}    

function updateHistogram(hist_id, data, color, label) {
    // Clear the old graph
    d3.select('#' + hist_id).select("svg").remove();
    // Set the dimensions and margins of the graph
    const margin = {top: 20, right: 20, bottom: 35, left: 40};
    const width = 380 - margin.left - margin.right;
    const height = 150 - margin.top - margin.bottom;        
    // Append the svg object to the body of the page
    const svg = d3.select('#' + hist_id)
              .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
              .append("g")
                .attr("transform",
                      "translate(" + margin.left + "," + margin.top + ")");
    // Set X axis        
    let min = Math.round((Math.min(...data) - 50) / 5) * 5;
    if (min < 0) { min = 0; }
    const x = d3.scaleLinear().domain([min, min+100]).range([0, width]);
    const xAxis = d3.axisBottom(x).tickValues(d3.range(min, min+101, 5));
    // Set the parameters for the histogram
    const histogram = d3.histogram().domain(x.domain()).thresholds(x.ticks(100));
    const bins = histogram(data);        
    const binWidth = x(bins[0].x1) - x(bins[0].x0);
    // Set X axis label
    const xAxisGroup = svg.append("g").attr("transform", "translate(" + binWidth/2 + "," + height + ")").call(xAxis);
    xAxisGroup.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)          // Center it horizontally
        .attr("y", 30)                 // Move it below the axis line
        .attr("fill", "black")         // Text needs a fill to be visible
        .attr("font-weight", "bold")
        .style("text-anchor", "middle")
        .text(label);        
    // Set Y axis
    const y = d3.scaleLinear().range([height, 0]).domain([0, 20]);
    const yAxisGroup = svg.append("g").call(d3.axisLeft(y));
    yAxisGroup.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)") // Rotate the text
        .attr("x", -height / 2)           // X is now vertical distance due to rotation
        .attr("y", -30)                  // Y is now horizontal distance
        .attr("fill", "black")
        .attr("font-weight", "bold")
        .style("text-anchor", "middle")
        .text("Population");        
    // Append the bars for series
    svg.selectAll("rect")
       .data(bins)
       .enter()
       .append("rect")
       .attr("x", 1)
       .attr("transform", function(d) { return "translate(" + x(d.x0) + "," + y(d.length) + ")"; })
       .attr("width", function(d) { return x(d.x1) - x(d.x0); })
       .attr("height", function(d) { return height - y(d.length); })
       .style("fill", color)
       .style("opacity", 1);
}

function updateGraphs() {        
    const data1 = predators.map(p => p.score);
    const data2 = preys.map(p => p.score);        
    updatePopulationGraph();
    updateHistogram('histogram1', data1, 'red', 'Visual acuity');
    updateHistogram('histogram2', data2, 'green', 'Camouflage');
}

function updateStats() {
    document.getElementById('round-display').textContent = round;        
    const avgPrey = preys.length ? (preys.reduce((sum, p) => sum + p.score, 0) / preys.length).toFixed(2) : 0;
    const avgPred = predators.length ? (predators.reduce((sum, p) => sum + p.score, 0) / predators.length).toFixed(2) : 0;
    n_preys.push(preys.length);
    n_predators.push(predators.length);
    const row = `<tr>
        <td>${round}</td>
        <td>${preys.length}</td>
        <td>${avgPrey}</td>
        <td>${predators.length}</td>
        <td>${avgPred}</td>
    </tr>`;
    // Prepend so newest is top
    document.getElementById('stats-body').innerHTML = row;
}

// Start
initGame();
