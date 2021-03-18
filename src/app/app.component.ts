import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, interval } from 'rxjs';
import { debounceTime, filter, switchMap, takeWhile } from 'rxjs/operators';
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

  private grid: GridNode[][] = [];
  public statistics: Statistic[];

  public timerRunning: boolean;
  public simulationEnded: boolean;
  public day: number;

  private readonly defaultSimulationParam: SimulationParameter = {
    daysIncubated: [2, 4],
    daysSymptomatic: 2,
    isolationRateSymptomatic: 0.3,
    transmissionProbability: 0.35,
    deathRate: 0.15,
    movementRadius: 1,
    numberOfContacts: 4,
  };
  paramForm: FormGroup;

  private readonly metaParam: MetaParameter = {
    nRows: 69,
    nCols: 69,
    nodeSize: 10,
    stepsPerSecond: 5,
  };
  metaForm: FormGroup;
  intervalPeriod = new BehaviorSubject<number>(1000 / this.metaParam.stepsPerSecond);

  constructor(
    private randomService: RandomService,
    private formBuilder: FormBuilder) { }

  ngOnInit() {
    this.initForms();

    this.initGrid();
    this.initPatientZero();

    this.timerRunning = false;
    this.simulationEnded = false;
    this.day = 0;

    this.statistics = [{ infectious: 1, recovered: 0, deceased: 0 }];

    this.initInterval();

    // const canvas = this.canvasRef.nativeElement;
    // canvas.width = this.nodeSize * this.nCols;
    // canvas.height = this.nodeSize * this.nRows;
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
        let node = new GridNode(this.randomService, r, c);
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

    this.intervalPeriod.pipe(
      switchMap(period => interval(period)),
      filter(() => this.timerRunning),
      takeWhile(() => !this.simulationEnded),
    ).subscribe(val => {
      // console.log('interval', val);
      this.simulateStep();
    });
  }

  private initForms() {
    this.paramForm = this.formBuilder.group({
      'daysIncubated': [this.defaultSimulationParam.daysIncubated, Validators.required],
      'daysSymptomatic': [this.defaultSimulationParam.daysSymptomatic, Validators.required],
      'isolationRateSymptomatic': [this.defaultSimulationParam.isolationRateSymptomatic, Validators.required],
      'transmissionProbability': [this.defaultSimulationParam.transmissionProbability, Validators.required],
      'deathRate': [this.defaultSimulationParam.deathRate, Validators.required],
      'movementRadius': [this.defaultSimulationParam.movementRadius, Validators.required],
      'numberOfContacts': [this.defaultSimulationParam.numberOfContacts, Validators.required],
    });

    this.metaForm = this.formBuilder.group({
      'stepsPerSecond': [this.metaParam.stepsPerSecond, Validators.required],
    });

    this.metaForm.valueChanges
      .pipe(
        debounceTime(200),
      )
      .subscribe(formValue => {
        this.intervalPeriod.next(1000 / formValue.stepsPerSecond);
      });

  }

  public toggleSimulationExecution() {
    if (this.simulationEnded) {
      console.log("reset");

      this.initForms();
      this.initGrid();
      this.initPatientZero();

      this.initInterval();

      this.timerRunning = false;
      this.simulationEnded = false;
      this.day = 0;

      this.statistics = [{ infectious: 1, recovered: 0, deceased: 0 }];

      // console.log('formValue', this.paramForm.value);
      // console.log('defSimParam', this.defaultSimulationParam);


      this.draw();
    } else {
      console.log("Toggling");
      this.timerRunning = !this.timerRunning;
    }
  }

  public simulateStep() {
    this.day++;

    // Start day
    for (let r = 0; r < this.metaParam.nRows; r++) {
      for (let c = 0; c < this.metaParam.nCols; c++) {
        let node = this.grid[r][c];
        node.nextState = node.state;
      }
    }

    // Infect
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
        node.evaluateNewState(this.paramForm.value.daysIncubated, this.paramForm.value.daysSymptomatic, this.paramForm.value.deathRate);
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

    // console.log(this.statistics[this.statistics.length - 1]);

    this.draw();

    this.simulationEnded = currentlyInfectious === 0;
  }

  private tryToInfect(node: GridNode, r: number, c: number) {
    let contacts: GridNode[] = [];
    if (node.isExposed || node.isInfected) {

      contacts = this.findContacts(r, c, this.paramForm.value.movementRadius, this.paramForm.value.numberOfContacts);

      // console.log(contacts.map(node => `row: ${node.rowIndex}, col: ${node.colIndex}, nextState: ${node.nextState}`));

      // contacts = this.findNeighbors(r, c);

      let transmissionProb = this.paramForm.value.transmissionProbability;
      // console.group('test');
      // console.log(transmissionProb);
      if (node.isInfected) {
        transmissionProb *= (1 - this.paramForm.value.isolationRateSymptomatic);
      }
      // console.log(transmissionProb);

      // console.groupEnd();

      for (let neighbor of contacts) {
        node.tryToInfect(neighbor, transmissionProb);
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

  private drawCell(r: number, c: number, node: GridNode) {
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
      this.context.fillStyle = GridStateColor.Receptive;
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
}
