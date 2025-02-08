import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit {
  @ViewChild('gameCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private players: { mesh: THREE.Mesh, controls: any }[] = [];
  private oxygenTank!: THREE.Mesh;
  private stars: THREE.Points | null = null;
  private walls: THREE.Mesh[] = [];
  private collisionRadius = 0.6;

  // 🔹 Mapa con dos jugadores (P y J)
  private mapData: string[] = [
    "1111111111111111111111",
    "110000000000000O00001",
    "101001010010000010100",
    "101001001010101000P100",
    "110000000O00O00000001",
    "100000000000000000000",
    "100000000000000000000",
    "10000000J0000000000000", // J representa al segundo jugador
    "100000000000000000000",
    "111111111111111111111"
  ];

  constructor() {}

  async ngOnInit(): Promise<void> {
    this.initThreeJS();
    this.createStars();
    this.generateMap();
    this.animate();
  }

  private initThreeJS() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 10;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvasRef.nativeElement });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
  }

  private createStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 500; i++) {
      const x = (Math.random() - 0.5) * 50;
      const y = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50;
      starVertices.push(x, y, z);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);
  }

  private generateMap() {
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const player1Material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const player2Material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const oxygenMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

    const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
    const playerGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const oxygenGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 32);

    for (let y = 0; y < this.mapData.length; y++) {
      for (let x = 0; x < this.mapData[y].length; x++) {
        const char = this.mapData[y][x];
        const posX = x - this.mapData[0].length / 2;
        const posY = this.mapData.length / 2 - y;

        if (char === '1') {
          this.addWall(posX, posY, wallGeometry, wallMaterial);
        } else if (char === 'P') {
          this.addPlayer(posX, posY, playerGeometry, player1Material, { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' });
        } else if (char === 'J') {
          this.addPlayer(posX, posY, playerGeometry, player2Material, { up: 'w', down: 's', left: 'a', right: 'd' });
        } else if (char === 'O') {
          this.addOxygenTank(posX, posY, oxygenGeometry, oxygenMaterial);
        }
      }
    }
  }

  private addWall(x: number, y: number, geometry: THREE.BoxGeometry, material: THREE.MeshBasicMaterial) {
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, y, 0);
    this.scene.add(wall);
    this.walls.push(wall);
  }

  private addPlayer(x: number, y: number, geometry: THREE.SphereGeometry, material: THREE.MeshBasicMaterial, controls: any) {
    const player = new THREE.Mesh(geometry, material);
    player.position.set(x, y, 0);
    this.scene.add(player);
    this.players.push({ mesh: player, controls });
  }

  private addOxygenTank(x: number, y: number, geometry: THREE.CylinderGeometry, material: THREE.MeshBasicMaterial) {
    this.oxygenTank = new THREE.Mesh(geometry, material);
    this.oxygenTank.position.set(x, y, 0);
    this.scene.add(this.oxygenTank);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    console.log(`Key pressed: ${event.key}`);
    const speed = 0.5;
    this.players.forEach(player => {
      let newX = player.mesh.position.x;
      let newY = player.mesh.position.y;
      if (event.key === player.controls.up) newY += speed;
      if (event.key === player.controls.down) newY -= speed;
      if (event.key === player.controls.left) newX -= speed;
      if (event.key === player.controls.right) newX += speed;
      if (!this.isColliding(newX, newY)) {
        player.mesh.position.set(newX, newY, 0);
      }
    });
    this.checkWinCondition();
  }

  private isColliding(x: number, y: number): boolean {
    return this.walls.some(wall => {
      const distance = Math.sqrt(Math.pow(wall.position.x - x, 2) + Math.pow(wall.position.y - y, 2));
      return distance < this.collisionRadius + 0.3;
    });
  }

  private checkWinCondition() {
    this.players.forEach((player, index) => {
      const distance = player.mesh.position.distanceTo(this.oxygenTank.position);
      if (distance < 0.5) {
        alert(`¡Jugador ${index + 1} ha ganado!`);
      }
    });
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    if (this.stars) {
      this.stars.rotation.y += 0.0005;
    }
    this.renderer.render(this.scene, this.camera);
  }
}
