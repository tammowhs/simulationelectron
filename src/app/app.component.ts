import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { empty } from 'rxjs';
import { NEVER } from 'rxjs';
import { interval, Subject } from 'rxjs';
import { dematerialize, filter, materialize, switchMap, takeWhile } from 'rxjs/operators';
import { GridNode } from './grid-node';

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
  }

  private initInterval() {
    interval(1000)
    .pipe(
      filter(() => this.timerRunning)
    )
    .subscribe(val => console.log(val));
  }

  private simulateStep() {
    // let actualRemovedCells = 0;
    // let linkedNodes: Set<GridNode> = new Set();

    // Start day
    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        let node = this.grid[r][c];
        node.startDay();
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

    let actualInfectedNodes = 0;
    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        let node = this.grid[r][c];
        if (node.isInfectious) {
          actualInfectedNodes++;
        }
      }
    }

    // let chanceOfIsolationAfterSymptoms = this.state.chanceOfIsolationAfterSymptoms;
    // if (!this.props.showChanceOfIsolationAfterSymptomsSlider) {
    //   chanceOfIsolationAfterSymptoms = 0;
    // }
    // let overCapacity = this.state.hospitalCapacityPct > -1 && actualInfectedNodes > this.state.hospitalCapacityPct * (nRows*nCols);


    const daysIncubating = 2;
    const daysSymptomatic = 2;
    const showDeaths = false;
    const deathRate = 0.15;

    for (let r = 0; r < this.nRows; r++) {
      for (let c = 0; c < this.nCols; c++) {
        let node = this.grid[r][c];
        node.endDay(daysIncubating,  daysSymptomatic, showDeaths, deathRate);
      }
    }
    // let actualDeadNodes = 0;
    // let actualRecoveredNodes = 0;
    // for (let r = 0; r < nRows; r++) {
    //   for (let c = 0; c < nCols; c++) {
    //     let node = this.grid[r][c];
    //     if (node.getNextState() === Constants.REMOVED) {
    //       actualRecoveredNodes++;
    //     } else if (node.getNextState() === Constants.DEAD) {
    //       actualDeadNodes++;
    //     }
    //   }
    // }



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

    // this.redraw(true);
  }

  private maybeInfect(node: GridNode, r: number, c: number): GridNode[] {
    let neighbors: GridNode[] = [];
    if (node.isInfectious) {
      neighbors = this.getNeighbors(r, c);
      let transProb = 0.15;
      transProb = Math.pow(transProb, 3);

      for (let neighbor of neighbors) {
        node.tryToInfect(neighbor, transProb);
      }
    }
    return neighbors;
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
