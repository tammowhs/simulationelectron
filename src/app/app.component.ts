import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { interval } from 'rxjs';
import { filter, takeWhile } from 'rxjs/operators';
import { GridNode } from './grid-node';
import { GridState, GridStateColor } from './grid-state.enum';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {

  @ViewChild('canvas', {static: true})
  public canvasRef!: ElementRef<HTMLCanvasElement>;

  private context!: CanvasRenderingContext2D;

  private nRows: number = 27;
  private nCols: number = this.nRows;
  private nodeSize: number = 20;

  private grid: GridNode[][] = [];

  private timerRunning: boolean = false;
  private simulationEnded: boolean = false;
  public day: number = 1;

  ngOnInit() {
    this.initGrid();
    this.initPatientZero();

    this.initInterval();

    // const canvas = this.canvasRef.nativeElement;
    // canvas.width = this.nodeSize * this.nCols;
    // canvas.height = this.nodeSize * this.nRows;

    this.timerRunning = false;
    this.simulationEnded = false;
    this.day = 1;
  }

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.nodeSize * this.nCols;
    canvas.height = this.nodeSize * this.nRows;

    this.context = canvas.getContext('2d')!;
    this.draw();
  }

  private initGrid() {
    this.grid = [];
    for (let r = 0; r < this.nRows; r++) {
      let row = [];
      for (let c = 0; c < this.nCols; c++) {
        let node = new GridNode(r, c);
        // node.immune = this.rng.random() < this.state.immunityFraction;

        row.push(node);
      }
      this.grid.push(row);
    }
  }

  private initPatientZero() {
    const centerRow = Math.floor(this.nRows / 2);
    const centerCol = Math.floor(this.nCols / 2);

    console.log(centerRow, centerCol);

    this.grid[centerRow][centerCol].state = GridState.Exposed;
  }

  private initInterval(fps: number = 3) {
    const period = 1000 / fps;

    interval(period)
    .pipe(
      filter(() => this.timerRunning),
      takeWhile(() => !this.simulationEnded),
    )
    .subscribe(val => {
      console.log('tick', val);
      this.simulateStep();
    });
  }

  public toggleSimulationExecution() {
    if(this.simulationEnded) {
      console.log("reset");

      this.ngOnInit();
      this.draw();
    } else {
      console.log("Toggling");
      this.timerRunning = !this.timerRunning;
    }
  }

  public simulateStep() {
    this.day++;
    // let actualRemovedCells = 0;
    // let linkedNodes: Set<GridNode> = new Set();

    // Start day
    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        let node = this.grid[r][c];
        node.nextState = node.state;
      }
    }

    // Infect
    // let centerNodeNeighborsToDisplay = [];
    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        let node = this.grid[r][c];
        // if (this.props.showInteractions && this.isCenterNode(r, c) && node.canInfectOthers()) {
        //   centerNodeNeighborsToDisplay = this.maybeInfect(node, r, c, linkedNodes);
        // } else {
          this.maybeInfect(node, r, c);
        // }
      }
    }

    // let chanceOfIsolationAfterSymptoms = this.state.chanceOfIsolationAfterSymptoms;
    // if (!this.props.showChanceOfIsolationAfterSymptomsSlider) {
    //   chanceOfIsolationAfterSymptoms = 0;
    // }
    // let overCapacity = this.state.hospitalCapacityPct > -1 && actualInfectedNodes > this.state.hospitalCapacityPct * (nRows*nCols);


    const daysIncubating = 2;
    const daysSymptomatic = 2;
    // const showDeaths = false;
    // const deathRate = 0.15;

    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        let node = this.grid[r][c];
        node.evaluateNewState(daysIncubating,  daysSymptomatic);
      }
    }

    let currentlyInfectious = 0;
    let currentlyRecovered = 0;
    let currentlyDeceased = 0;
    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        let node = this.grid[r][c];
        
        if (node.isRecovered) {
          currentlyRecovered++;
        }

        if (node.isDeceased) {
          currentlyDeceased++;
        }

        if (node.isInfectious) {
          currentlyInfectious++;
        }
      }
    }



    // this.state.capacityPerDay.push(this.state.hospitalCapacityPct * this.props.gridRows * this.props.gridRows);
    // this.state.deadPerDay.push(actualDeadNodes);
    // this.state.infectedPerDay.push(actualInfectedNodes);
    // this.state.recoveredPerDay.push(actualRecoveredNodes);

    // this.state.centerNodeNeighborsToDisplay = centerNodeNeighborsToDisplay;

    // Update the number of active nodes, and the playing bit if necessary
    // this.setState({
    //   numActiveNodes: actualInfectedNodes,
    //   playing: this.state.playing && actualInfectedNodes !== 0,
    // });

    this.draw();

    this.simulationEnded = currentlyInfectious === 0;
  }

  private maybeInfect(node: GridNode, r: number, c: number) {
    let neighbors: GridNode[] = [];
    if (node.isInfectious) {
      neighbors = this.getNeighbors(r, c);
      let transProb = 0.33;
      // transProb = Math.pow(transProb, 3);

      for (let neighbor of neighbors) {
        node.tryToInfect(neighbor, transProb);
      }
    }
  }

  private getNeighbors(r: number, c: number): GridNode[] {
    let neighbors: GridNode[] = [];

    // Just the four cardinal neighbors
    if (r > 0) {
      neighbors.push(this.grid[r-1][c]);
    }
    if (c > 0) {
      neighbors.push(this.grid[r][c-1]);
    }
    if (r < this.grid.length - 1) {
      neighbors.push(this.grid[r+1][c]);
    }
    if (c < this.grid[0].length - 1) {
      neighbors.push(this.grid[r][c+1]);
    }

    return neighbors;
  }

  private draw() {
    this.context.fillStyle = '#fff';

    const gridWidth = this.nCols * this.nodeSize;
    this.context.fillRect(0, 0, gridWidth, gridWidth);

    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        let node = this.grid[r][c];
        this.drawCell(r, c, node);
      }
    }
  }

  drawCell(r: number, c: number, node: GridNode) {
    let y = r * this.nodeSize;
    let x = c * this.nodeSize;

    if (node.isExposed) {
      this.context.fillStyle = GridStateColor.Exposed;
    }

    if (node.isInfected) {
      this.context.fillStyle = GridStateColor.Infected;
    } 

    if (node.isRecovered) {
      this.context.fillStyle = GridStateColor.Recovered;
    } 
    
    if (node.isDeceased) {
      this.context.fillStyle = GridStateColor.Deceased;
    }
    
    if(node.isReceptive) {
      // Node is susceptible
      this.context.fillStyle = GridStateColor.Receptive;

      // if (node.specialDegree !== null) {
      //   // should be somewhere between 4 and 8
      //   Utils.assert(node.specialDegree >= 4 && node.specialDegree <= 8, "node.specialDegree should be between 4 and 8; was: " + node.specialDegree);
      //   let intensity = (node.specialDegree - 4) / 4.0;
      //   context.fillStyle = Colors.hex(Colors.blend(Colors.makeHex(Grid.SUSCEPTIBLE_COLOR), Colors.makeHex('#BBB'), intensity))
      // }
    }

    let gap = 1;
    // if (this.nodeSize < 5 || this.nodeSize < this.props.nodeSize) {
    //   gap = 0;
    // }

    // context.fillRect(x, y, w, w);
    this.context.fillRect(x, y, this.nodeSize - gap, this.nodeSize - gap);
    // context.beginPath();
    // context.arc(x+w/2, y+w/2, w/2-1, 0, 2 * Math.PI);
    // context.fill();

    // if (highlight || (node.linked && this.state.longDistaceNetworkActive)) {
    //   // context.beginPath();
    //   context.lineWidth = 1;
    //   context.strokeStyle = '#000';
    //   let left = x - 0.5;
    //   let wid = w - gap + 1;
    //   if (x === 0) {
    //     left = 0.5;
    //     wid = wid - 1;
    //   }
    //   let top = y - 0.5;
    //   let hei = w - gap + 1;
    //   if (y === 0) {
    //     top = 0.5;
    //     hei = hei - 1;
    //   }
    //   // if (node.isIsolating()) {
    //   //   context.strokeRect(left+1, top+1, wid-2, hei-2);
    //   // } else {
    //   context.strokeRect(left, top, wid, hei);
    //   // }
    // }
  }

//   private drawGrid () {
//     let squareSizePx = 28;
//     let paddingLeft = squareSizePx;
//     let paddingTop = squareSizePx;
//     let paddingRight = squareSizePx;
//     let paddingBottom = squareSizePx;
    
//     this.context.strokeStyle = 'lightgrey';
//     this.context.beginPath();
//     for (var x = paddingLeft; x <= this.width - paddingRight; x += squareSizePx) {
//        this.context.moveTo(x, paddingTop)
//        this.context.lineTo(x, this.height - paddingBottom)
//     }
//     for (var y = paddingTop; y <= this.height - paddingBottom; y += squareSizePx) {
//        this.context.moveTo(paddingLeft, y)
//        this.context.lineTo(this.width - paddingRight, y)
//     }
//     this.context.stroke()
//  }
}
