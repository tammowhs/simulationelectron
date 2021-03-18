import { GridState } from "./grid-state.enum";
import { RandomService } from "./random.service";

export class GridNode {
  public rowIndex: number;
  public colIndex: number;

  private _state: GridState = GridState.Receptive;
  private _nextState: GridState = GridState.Receptive;
  private daysInCurrentState: number = 0;

  // private isolating: boolean = false;

  constructor(private randomService: RandomService, rowIndex: number, colIndex: number) {
    this.rowIndex = rowIndex;
    this.colIndex = colIndex;
  }

  get state() {
    return this._state;
  }

  set state(newState: GridState) {
    this._state = newState;
  }

  get nextState() {
    return this._nextState;
  }

  set nextState(newState: GridState) {
    this._nextState = newState;
  }

  get isReceptive() {
    return this._state === GridState.Receptive;
  }

  get isExposed() {
    return this._state === GridState.Exposed;
  }

  get isInfected() {
    return this._state === GridState.Infected;
  }

  get isRecovered() {
    return this._state === GridState.Recovered;
  }

  get isDeceased() {
    return this._state === GridState.Deceased;
  }

  get isInfectious() {
    return this._state === GridState.Exposed || this._state === GridState.Infected;
  }

  // startDay() {
  //   this._nextState = this._state;
  // }

  // allowDeaths: boolean, deathRate: number
  evaluateNewState(daysIncubating: [number, number], daysSymptomatic: number, deathRate: number) {
    if (this.nextState !== this.state) {
      this.daysInCurrentState = 0;
      this.state = this.nextState;
    } else {
      this.daysInCurrentState++;

      if (this.isExposed) {
        const effectiveDaysIncubating = this.randomService.randomInRange(daysIncubating[0], daysIncubating[1]);
        if (this.daysInCurrentState >= effectiveDaysIncubating) {
          this.state = GridState.Infected;
          this.daysInCurrentState = 0;
        }
      }

      if (this.isInfected) {
        if (this.daysInCurrentState >= daysSymptomatic) {
          // if (overHospitalCapacity) {
          //   deathRate = deathRate * 2;
          // }

          if (Math.random() < deathRate) {
            this.state = GridState.Deceased;
          } else {
            this.state = GridState.Recovered;
          }

          this.daysInCurrentState = 0;
        }
      }
    }
  }

  tryToInfect(neighbor: GridNode, transProb: number) {
    if (neighbor.isReceptive && Math.random() < transProb) {
      neighbor.nextState = GridState.Exposed;
    }
  }
}
