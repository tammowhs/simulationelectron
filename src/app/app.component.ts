import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { interval } from 'rxjs';
import { debounceTime, filter, takeWhile } from 'rxjs/operators';
import { GridNode } from './grid-node';
import { GridState, GridStateColor } from './grid-state.enum';
import { MetaParameter } from './meta-parameter';
import { RandomService } from './random.service';
import { SimulationParameter } from './simulation-parameter';
import { Statistic } from './statistic';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {

  @ViewChild('canvas', { static: true })
  public canvasRef: ElementRef<HTMLCanvasElement>;

  private context: CanvasRenderingContext2D;

  private metaParam: MetaParameter = {
    nRows: 69,
    nCols: 69,
    nodeSize: 10,
    stepsPerSecond: 2,
  }

  private grid: GridNode[][] = [];
  public statistics: Statistic[];

  private timerRunning: boolean;
  public simulationEnded: boolean;
  public day: number;

  private readonly defaultSimulationParam: SimulationParameter = {
    daysIncubated: 2,
    daysSymptomatic: 2,
    transmissionProbability: 0.35,
    deathRate: 0.15,
    movementRadius: 1,
    numberOfContacts: 4,
  };

  private simulationParam: SimulationParameter;

  paramForm: FormGroup;


  constructor(
    private randomService: RandomService,
    private formBuilder: FormBuilder) { }

  ngOnInit() {
    this.initForm();
    this.simulationParam = { ...this.paramForm.value };

    this.initGrid();
    this.initPatientZero();

    this.timerRunning = false;
    this.simulationEnded = false;
    this.day = 0;

    this.initInterval();

    // const canvas = this.canvasRef.nativeElement;
    // canvas.width = this.nodeSize * this.nCols;
    // canvas.height = this.nodeSize * this.nRows;



    this.statistics = [{ infectious: 1, recovered: 0, deceased: 0 }];
  }

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.metaParam.nodeSize * this.metaParam.nCols;
    canvas.height = this.metaParam.nodeSize * this.metaParam.nRows;

    this.context = canvas.getContext('2d')!;
    this.draw();
  }

  private initGrid() {
    this.grid = [];
    for (let r = 0; r < this.metaParam.nRows; r++) {
      let row = [];
      for (let c = 0; c < this.metaParam.nCols; c++) {
        let node = new GridNode(r, c);
        // node.immune = this.rng.random() < this.state.immunityFraction;

        row.push(node);
      }
      this.grid.push(row);
    }
  }

  private initPatientZero() {
    const centerRow = Math.floor(this.metaParam.nRows / 2);
    const centerCol = Math.floor(this.metaParam.nCols / 2);

    this.grid[centerRow][centerCol].state = GridState.Exposed;
  }

  private initInterval() {

    const period = 1000 / this.metaParam.stepsPerSecond;
    interval(period)
      .pipe(
        filter(() => this.timerRunning),
        takeWhile(() => !this.simulationEnded),
      )
      .subscribe(val => {
        // console.log('tick', val);
        this.simulateStep();
      });
  }

  private initForm() {
    this.paramForm = this.formBuilder.group({
      'daysIncubated': [this.defaultSimulationParam.daysIncubated, Validators.required],
      'daysSymptomatic': [this.defaultSimulationParam.daysSymptomatic, Validators.required],
      'transmissionProbability': [this.defaultSimulationParam.transmissionProbability, Validators.required],
      'deathRate': [this.defaultSimulationParam.deathRate, Validators.required],
      'movementRadius': [this.defaultSimulationParam.movementRadius, Validators.required],
      'numberOfContacts': [this.defaultSimulationParam.numberOfContacts, Validators.required]
    });

    this.paramForm.valueChanges
      .pipe(
        debounceTime(200)
      )
      .subscribe((formValue) => {
        console.log(formValue);
        this.simulationParam.daysIncubated = formValue.daysIncubated;
        this.simulationParam.daysSymptomatic = formValue.daysSymptomatic;
        this.simulationParam.transmissionProbability = formValue.transmissionProbability;
        this.simulationParam.deathRate = formValue.deathRate;
        this.simulationParam.movementRadius = formValue.movementRadius;
        this.simulationParam.numberOfContacts = formValue.numberOfContacts;
      });
  }

  public toggleSimulationExecution() {
    if (this.simulationEnded) {
      console.log("reset");

      this.initForm();
      this.simulationParam = { ...this.paramForm.value };
      this.initGrid();
      this.initPatientZero();

      this.initInterval();

      this.timerRunning = false;
      this.simulationEnded = false;
      this.day = 1;

      this.statistics = [{ infectious: 1, recovered: 0, deceased: 0 }];

      console.log('formValue', this.paramForm.value);
      console.log('simParam', this.simulationParam);
      console.log('defSimParam', this.defaultSimulationParam);


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
    for (let r = 0; r < this.metaParam.nRows; r++) {
      for (let c = 0; c < this.metaParam.nCols; c++) {
        let node = this.grid[r][c];
        node.nextState = node.state;
      }
    }

    // Infect
    // let centerNodeNeighborsToDisplay = [];
    for (let r = 0; r < this.metaParam.nRows; r++) {
      for (let c = 0; c < this.metaParam.nCols; c++) {
        let node = this.grid[r][c];
        // if (this.props.showInteractions && this.isCenterNode(r, c) && node.canInfectOthers()) {
        //   centerNodeNeighborsToDisplay = this.maybeInfect(node, r, c, linkedNodes);
        // } else {
        this.tryToInfect(node, r, c);
        // }
      }
    }

    // let chanceOfIsolationAfterSymptoms = this.state.chanceOfIsolationAfterSymptoms;
    // if (!this.props.showChanceOfIsolationAfterSymptomsSlider) {
    //   chanceOfIsolationAfterSymptoms = 0;
    // }
    // let overCapacity = this.state.hospitalCapacityPct > -1 && actualInfectedNodes > this.state.hospitalCapacityPct * (nRows*nCols);

    for (let r = 0; r < this.metaParam.nRows; r++) {
      for (let c = 0; c < this.metaParam.nCols; c++) {
        let node = this.grid[r][c];
        node.evaluateNewState(this.simulationParam.daysIncubated, this.simulationParam.daysSymptomatic, this.simulationParam.deathRate);
      }
    }

    let currentlyInfectious = 0;
    let currentlyRecovered = 0;
    let currentlyDeceased = 0;
    for (let r = 0; r < this.metaParam.nRows; r++) {
      for (let c = 0; c < this.metaParam.nCols; c++) {
        let node = this.grid[r][c];

        if (node.isInfectious) {
          currentlyInfectious++;
        }

        if (node.isRecovered) {
          currentlyRecovered++;
        }

        if (node.isDeceased) {
          currentlyDeceased++;
        }
      }
    }

    this.statistics.push({
      infectious: currentlyInfectious,
      recovered: currentlyRecovered,
      deceased: currentlyDeceased,
    });

    console.log(this.statistics[this.statistics.length - 1]);

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

  private tryToInfect(node: GridNode, r: number, c: number) {
    let contacts: GridNode[] = [];
    if (node.isInfectious) {

      contacts = this.findContacts(r, c, this.simulationParam.movementRadius, this.simulationParam.numberOfContacts);

      // console.log(contacts.map(node => `row: ${node.rowIndex}, col: ${node.colIndex}, nextState: ${node.nextState}`));

      // contacts = this.findNeighbors(r, c);

      // transProb = Math.pow(transProb, 3);
      for (let neighbor of contacts) {
        node.tryToInfect(neighbor, this.simulationParam.transmissionProbability);
      }
    }
  }

  private findContacts(row: number, col: number, radius: number, countNodes: number): GridNode[] {
    let contacts: GridNode[] = [];

    if (radius === 0 || countNodes === 0) {
      return contacts;
    }

    for (let i = 0; i < countNodes; i++) {
      const rowDeviation = this.randomService.randomInRange(radius * -1, radius);
      const colDeviation = this.randomService.randomInRange(radius * -1, radius);

      if (rowDeviation === 0 && colDeviation === 0) {
        i--;
        continue;
      }

      if (this.isNodeInGrid(row + rowDeviation, col + colDeviation)) {
        const node = this.grid[row + rowDeviation][col + colDeviation];
        contacts.push(node);
      }
    }

    return contacts;
  }

  private findNeighbors(r: number, c: number): GridNode[] {
    let neighbors: GridNode[] = [];

    // Just the four cardinal neighbors
    if (r > 0) {
      neighbors.push(this.grid[r - 1][c]);
    }
    if (c > 0) {
      neighbors.push(this.grid[r][c - 1]);
    }
    if (r < this.grid.length - 1) {
      neighbors.push(this.grid[r + 1][c]);
    }
    if (c < this.grid[0].length - 1) {
      neighbors.push(this.grid[r][c + 1]);
    }

    return neighbors;
  }

  private isNodeInGrid(r: number, c: number): boolean {
    return r >= 0 && c >= 0 && r < this.grid.length && c < this.grid[0].length;
  }

  private draw() {
    this.context.fillStyle = '#fff';

    const gridWidth = this.metaParam.nCols * this.metaParam.nodeSize;
    this.context.fillRect(0, 0, gridWidth, gridWidth);

    for (let r = 0; r < this.metaParam.nRows; r++) {
      for (let c = 0; c < this.metaParam.nCols; c++) {
        let node = this.grid[r][c];
        this.drawCell(r, c, node);
      }
    }
  }

  drawCell(r: number, c: number, node: GridNode) {
    let y = r * this.metaParam.nodeSize;
    let x = c * this.metaParam.nodeSize;

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

    if (node.isReceptive) {
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
    this.context.fillRect(x, y, this.metaParam.nodeSize - gap, this.metaParam.nodeSize - gap);
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
