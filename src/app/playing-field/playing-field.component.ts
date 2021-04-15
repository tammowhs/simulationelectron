import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { GridNode } from '../grid-node';
import { GridStateColor } from '../grid-state.enum';
import { MetaParameter } from '../meta-parameter';
import { SimulationStepService } from '../simulation-step.service';

@Component({
  selector: 'app-playing-field',
  templateUrl: './playing-field.component.html',
  styleUrls: ['./playing-field.component.scss']
})
export class PlayingFieldComponent implements OnInit {

  @ViewChild('canvas', { static: true })
  public canvasRef: ElementRef<HTMLCanvasElement>;

  private context: CanvasRenderingContext2D;

  private metaParam: MetaParameter;

  constructor(private simulationStepService: SimulationStepService){ }
  
  ngOnInit(): void {
    this.metaParam = this.simulationStepService.metaParam;

    const canvas = this.canvasRef.nativeElement;
    this.context = canvas.getContext('2d')!;
    canvas.width = this.metaParam.nodeSize * this.metaParam.nCols;
    canvas.height = this.metaParam.nodeSize * this.metaParam.nRows;
    
    this.simulationStepService.grid.subscribe(value => {
      this.draw(value);
    })
  }

  private draw(grid: GridNode[][]) {
    this.context.fillStyle = '#fff';

    const numberOfRows = grid.length;
    const numberOfCols = grid[0].length;

    const gridHeight = numberOfRows * this.metaParam.nodeSize;
    const gridWidth = numberOfCols * this.metaParam.nodeSize;
    this.context.fillRect(0, 0, gridWidth, gridHeight);

    for (let r = 0; r < numberOfRows; r++) {
      for (let c = 0; c < numberOfCols; c++) {
        const node = grid[r][c];
        this.drawCell(r, c, node);
      }
    }
  }

  private drawCell(row: number, col: number, node: GridNode) {
    const y = row * this.metaParam.nodeSize;
    const x = col * this.metaParam.nodeSize;

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

    const gap = 1;

    this.context.fillRect(x, y, this.metaParam.nodeSize - gap, this.metaParam.nodeSize - gap);
  }
  
}
