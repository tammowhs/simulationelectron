import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { GridNode } from './grid-node';
import { GridState } from './grid-state.enum';
import { MetaParameter } from './meta-parameter';
import { RandomService } from './random.service';
import { SimulationParameter } from './simulation-parameter';
import { Statistic } from './statistic';

@Injectable({
  providedIn: 'root'
})
export class SimulationStepService {

  constructor(private randomService: RandomService) {  }

  public readonly metaParam: MetaParameter = {
    nRows: 69,
    nCols: 69,
    nodeSize: 10,
    stepsPerSecond: 5,
  };

  private _grid: BehaviorSubject<GridNode[][]> = new BehaviorSubject(this.getInitialGrid());
  public readonly grid: Observable<GridNode[][]> = this._grid.asObservable();
  private currentGrid: GridNode[][];

  private _statistics: BehaviorSubject<Statistic[]> = new BehaviorSubject([
      { day: 0, infectious: 1, recovered: 0, deceased: 0, healthy: this.metaParam.nCols * this.metaParam.nRows - 1 } as Statistic
    ]);
  public readonly statistics: Observable<Statistic[]> = this._statistics.asObservable();

  private _day: BehaviorSubject<number> = new BehaviorSubject(0);
  public readonly day: Observable<number> = this._day.asObservable();

  private _simulationEnded: BehaviorSubject<boolean> = new BehaviorSubject(false as boolean);
  public readonly simulationEnded: Observable<boolean> = this._simulationEnded.asObservable();

  public simulateStep(currentParams: SimulationParameter) {
    let day = this._day.getValue();
    day++;
    this._day.next(day);

    this.currentGrid = this._grid.getValue();

    for (let r = 0; r < this.currentGrid.length; r++) {
      for (let c = 0; c < this.currentGrid[0].length; c++) {
        const node = this.currentGrid[r][c];
        node.nextState = node.state;
      }
    }

    for (let r = 0; r < this.currentGrid.length; r++) {
      for (let c = 0; c < this.currentGrid[0].length; c++) {
        const node = this.currentGrid[r][c];
        this.tryToInfect(node, currentParams);
      }
    }

    const newStatistic: Statistic = this.evaluateNewState(currentParams, day);

    const currentStatistics = this._statistics.getValue();
    currentStatistics.push(newStatistic);
    this._statistics.next(currentStatistics);

    this._grid.next(this.currentGrid);

    this._simulationEnded.next(newStatistic.infectious === 0);
  }

  public reset() {
    this._simulationEnded.next(false);
    this._day.next(0);
    this._statistics.next([
      { day: 0, infectious: 1, recovered: 0, deceased: 0, healthy: this.metaParam.nCols * this.metaParam.nRows - 1 } as Statistic
    ]);
    this._grid.next(this.getInitialGrid());
  }

  private tryToInfect(node: GridNode, currentParams: SimulationParameter) {
    if (node.isInfected || node.isExposed) {
      const contacts: GridNode[] = this.findContacts(node.rowIndex, node.colIndex, currentParams.movementRadius, currentParams.numberOfContacts);

      let transmissionProb = currentParams.transmissionProbability;
      if (node.isIsolating) {
        transmissionProb *= 0.1;
      }

      for (const contact of contacts) {
        node.tryToInfect(contact, transmissionProb, currentParams.reInfectionRate);
      }
    }
  }

  private findContacts(row: number, col: number, radius: number, countNodes: number): GridNode[] {
    const contacts: GridNode[] = [];

    if (radius === 0 || countNodes === 0) {
      return contacts;
    }

    for (let i = 0; i < countNodes; i++) {
      const rowDeviation = this.randomService.randomInRange(radius * -1, radius);
      const colDeviation = this.randomService.randomInRange(radius * -1, radius);

      if ((rowDeviation === 0 && colDeviation === 0) || !this.isNodeInGrid(row + rowDeviation, col + colDeviation)) {
        i--;
        continue;
      }
      const node = this.currentGrid[row + rowDeviation][col + colDeviation];
      contacts.push(node);
    }

    return contacts;
  }

  private isNodeInGrid(row: number, col: number): boolean {
    return row >= 0 && col >= 0 && row < this.currentGrid.length && col < this.currentGrid[0].length;
  }

  private evaluateNewState(currentParams: SimulationParameter, day: number): Statistic {
    let currentlyInfectious = 0;
    let currentlyRecovered = 0;
    let currentlyDeceased = 0;
    let currentlyReceptive = 0;

    for (let r = 0; r < this.currentGrid.length; r++) {
      for (let c = 0; c < this.currentGrid[0].length; c++) {
        const node = this.currentGrid[r][c];
        node.evaluateNewState(currentParams.daysIncubated,
                              currentParams.daysSymptomatic,
                              currentParams.deathRate,
                              currentParams.isolationRateSymptomatic);

        if (node.isInfected || node.isExposed) {
          currentlyInfectious++;
        }

        if (node.isRecovered) {
          currentlyRecovered++;
        }

        if (node.isDeceased) {
          currentlyDeceased++;
        }

        if (node.isReceptive) {
          currentlyReceptive++;
        }
      }
    }

    return {
      day: day,
      infectious: currentlyInfectious,
      recovered: currentlyRecovered,
      deceased: currentlyDeceased,
      healthy: currentlyReceptive,
    };
  }

  private getInitialGrid(): GridNode[][] {
    const grid: GridNode[][] = [];
    for (let r = 0; r < this.metaParam.nRows; r++) {
      const row = [];

      for (let c = 0; c < this.metaParam.nCols; c++) {
        const node = new GridNode(this.randomService, r, c);
        row.push(node);
      }

      grid.push(row);
    }

    this.initPatientsZero(grid);
    return grid;
  }

  private initPatientsZero(grid: GridNode[][], patientCoordinates?: { row: number, col: number }[]) {
    if (!patientCoordinates) {
      const centerRow = Math.floor(grid.length / 2);
      const centerCol = Math.floor(grid[0].length / 2);

      patientCoordinates = [{ row: centerRow, col: centerCol }];
    }
    patientCoordinates.forEach(coord => {
      const node = grid[coord.row][coord.col];
      node.nextState = GridState.Exposed;
      node.evaluateNewState(0,0,0,0);
    });
  }
}
