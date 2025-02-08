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
  private player!: { 
    mesh: THREE.Mesh, 
    controls: any, 
    textures: { [key: string]: THREE.Texture[] }, 
    currentTextureIndex: number,
    direction: string
  };
  private oxygenTank!: THREE.Mesh;
  private stars: THREE.Points | null = null;
  private walls: THREE.Mesh[] = [];
  private collisionRadius = 0.6;

  private textureLoader = new THREE.TextureLoader();

  // Texturas del mapa
  private wallTexture = this.textureLoader.load('https://i.ibb.co/KcF96vpW/3.png');
  private oxygenTexture = this.textureLoader.load('https://i.ibb.co/wNbdzMNg/Shattered-Planet7.png');

  // Texturas del personaje P
  private playerTextures: { [key: string]: THREE.Texture[] } = {
    'right': [
      this.textureLoader.load('https://i.ibb.co/xKwcLM6g/step1-removebg.png'),
      this.textureLoader.load('https://i.ibb.co/dS5ppNW/step2-removebg.png')
    ],
    'left': [
      this.textureLoader.load('https://i.ibb.co/xKwcLM6g/step1-removebg.png'),
      this.textureLoader.load('https://i.ibb.co/dS5ppNW/step2-removebg.png')
    ],
    'up': [
      this.textureLoader.load('https://i.ibb.co/xKwcLM6g/step1-removebg.png'),
      this.textureLoader.load('https://i.ibb.co/dS5ppNW/step2-removebg.png')
    ],
    'down': [
      this.textureLoader.load('https://i.ibb.co/xKwcLM6g/step1-removebg.png'),
      this.textureLoader.load('https://i.ibb.co/dS5ppNW/step2-removebg.png')
    ]
  };

  // Mapa con un solo jugador (P)
  private mapData: string[] = [
    "1111111111111111111111",
    "110000000000000O00001",
    "101001010010000010100",
    "101001001010101000P100",
    "110000000O00O00000001",
    "100000000000000000000",
    "100000000000000000000",
    "1000000000000000000000",
    "100000000000000000000",
    "111111111111111111111"
  ];

  constructor() {}

  async ngOnInit(): Promise<void> {
    this.initThreeJS();
    this.createStars();
    this.generateMap();
    this.animateScene();
  }

  private animateScene() {
    requestAnimationFrame(() => this.animateScene());

    // Animación del fondo de estrellas
    if (this.stars) {
      this.stars.rotation.y += 0.0005;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private initThreeJS() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 10;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvasRef.nativeElement, alpha: true });
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
    const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
    const wallMaterial = new THREE.MeshBasicMaterial({ map: this.wallTexture });
    const oxygenGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 32);
    const oxygenMaterial = new THREE.MeshBasicMaterial({ map: this.oxygenTexture });
    const playerGeometry = new THREE.PlaneGeometry(1, 1.5);

    for (let y = 0; y < this.mapData.length; y++) {
      for (let x = 0; x < this.mapData[y].length; x++) {
        const char = this.mapData[y][x];
        const posX = x - this.mapData[0].length / 2;
        const posY = this.mapData.length / 2 - y;

        if (char === '1') {
          this.addWall(posX, posY, wallGeometry, wallMaterial);
        } else if (char === 'P') {
          this.addPlayer(posX, posY, playerGeometry, this.playerTextures, { up: 'w', down: 's', left: 'a', right: 'd' });
        } else if (char === 'O') {
          this.addOxygenTank(posX, posY, oxygenGeometry, oxygenMaterial);
        }
      }
    }
  }

  private addPlayer(x: number, y: number, geometry: THREE.PlaneGeometry, textures: { [key: string]: THREE.Texture[] }, controls: any) {
    const material = new THREE.MeshBasicMaterial({ map: textures['right'][0], transparent: true });
    const player = new THREE.Mesh(geometry, material);
    player.position.set(x, y, 0);
    this.scene.add(player);
    this.player = { mesh: player, controls, textures, currentTextureIndex: 0, direction: 'right' };
  }

  private addWall(x: number, y: number, geometry: THREE.BoxGeometry, material: THREE.MeshBasicMaterial) {
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, y, 0);
    this.scene.add(wall);
    this.walls.push(wall);
  }

  private addOxygenTank(x: number, y: number, geometry: THREE.CylinderGeometry, material: THREE.MeshBasicMaterial) {
    this.oxygenTank = new THREE.Mesh(geometry, material);
    this.oxygenTank.position.set(x, y, 0);
    this.scene.add(this.oxygenTank);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const speed = 0.5;
    let newX = this.player.mesh.position.x;
    let newY = this.player.mesh.position.y;

    let newDirection = this.player.direction;

    if (event.key === this.player.controls.right) {
      newX += speed;
      newDirection = 'right';
      this.player.mesh.scale.x = 1; 
    }
    if (event.key === this.player.controls.left) {
      newX -= speed;
      newDirection = 'left';
      this.player.mesh.scale.x = -1; 
    }
    if (event.key === this.player.controls.up) {
      newY += speed;
      newDirection = 'up';
    }
    if (event.key === this.player.controls.down) {
      newY -= speed;
      newDirection = 'down';
    }

    this.player.currentTextureIndex = (this.player.currentTextureIndex + 1) % this.player.textures[newDirection].length;
    (this.player.mesh.material as THREE.MeshBasicMaterial).map = this.player.textures[newDirection][this.player.currentTextureIndex];

    this.player.mesh.position.set(newX, newY, 0);
  }
}
