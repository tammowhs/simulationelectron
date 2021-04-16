import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { GridNode } from '../grid-node';
import { GridStateColor } from '../grid-state.enum';
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

  constructor(private simulationStepService: SimulationStepService){ }
  
  public ngOnInit(): void {
    const nodeSize = this.simulationStepService.metaParam.nodeSize;
    
    const canvas = this.canvasRef.nativeElement;
    this.context = canvas.getContext('2d')!;
    canvas.width = nodeSize * this.simulationStepService.metaParam.nCols;
    canvas.height = nodeSize * this.simulationStepService.metaParam.nRows;
    
    this.simulationStepService.grid.subscribe(value => {
      this.draw(value, nodeSize);
    })
  }

  private draw(grid: GridNode[][], nodeSize: number) {
    this.context.fillStyle = '#fff';

    const numberOfRows = grid.length;
    const numberOfCols = grid[0].length;

    const gridHeight = numberOfRows * nodeSize;
    const gridWidth = numberOfCols * nodeSize;
    this.context.fillRect(0, 0, gridWidth, gridHeight);

    for (let r = 0; r < numberOfRows; r++) {
      for (let c = 0; c < numberOfCols; c++) {
        const node = grid[r][c];
        this.drawCell(r, c, node, nodeSize);
      }
    }
  }

  private drawCell(row: number, col: number, node: GridNode, nodeSize: number) {
    const y = row * nodeSize;
    const x = col * nodeSize;

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

    this.context.fillRect(x, y, nodeSize - gap, nodeSize - gap);
  }
  
}
