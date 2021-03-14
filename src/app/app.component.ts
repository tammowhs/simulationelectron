import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { empty } from 'rxjs';
import { NEVER } from 'rxjs';
import { interval, Subject } from 'rxjs';
import { dematerialize, filter, materialize, switchMap, takeWhile } from 'rxjs/operators';
import { GridNode } from './grid-node';
import { GridState, GridStateColor } from './grid-state.enum';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  width = 600;
  height = 600;

  @ViewChild('canvas', {static: true})
  public canvasRef!: ElementRef<HTMLCanvasElement>;

  private context!: CanvasRenderingContext2D;

  private nRows: number = 9;
  private nCols: number = 9;

  private grid: GridNode[][] = [];

  public timerRunning: boolean = false;

  ngOnInit() {
    this.initGrid();
    this.initInterval();

    this.canvasRef.nativeElement.width = 30 * 9;
    this.canvasRef.nativeElement.height = 30 * 9;
  }

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.context = canvas.getContext('2d')!;
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

    this.grid[4][4].state = GridState.Exposed;
  }

  private initInterval() {
    interval(1000)
    .pipe(
      filter(() => this.timerRunning)
    )
    .subscribe(val => {
      console.log('tick', val);
      this.simulateStep();
    });
  }

  public simulateStep() {
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

    let currentlyInfected = 0;
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
          currentlyInfected++;
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
  }

  private maybeInfect(node: GridNode, r: number, c: number) {
    let neighbors: GridNode[] = [];
    if (node.isInfectious) {
      neighbors = this.getNeighbors(r, c);
      let transProb = 0.15;
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

    const gridWidth = this.nCols * 30;
    this.context.fillRect(0, 0, gridWidth, gridWidth);

    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        let node = this.grid[r][c];
        this.drawCell(r, c, node);
      }
    }
  }

  drawCell(r: number, c: number, node: GridNode) {
    let w = 30;
    let y = r * w;
    let x = c * w;

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
    this.context.fillRect(x, y, w - gap, w - gap);
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

  private drawGrid () {
    let squareSizePx = 28;
    let paddingLeft = squareSizePx;
    let paddingTop = squareSizePx;
    let paddingRight = squareSizePx;
    let paddingBottom = squareSizePx;
    
    this.context.strokeStyle = 'lightgrey';
    this.context.beginPath();
    for (var x = paddingLeft; x <= this.width - paddingRight; x += squareSizePx) {
       this.context.moveTo(x, paddingTop)
       this.context.lineTo(x, this.height - paddingBottom)
    }
    for (var y = paddingTop; y <= this.height - paddingBottom; y += squareSizePx) {
       this.context.moveTo(paddingLeft, y)
       this.context.lineTo(this.width - paddingRight, y)
    }
    this.context.stroke()
 }
}
