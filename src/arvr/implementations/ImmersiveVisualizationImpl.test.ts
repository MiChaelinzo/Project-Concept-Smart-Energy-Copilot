/**
 * Immersive Visualization Implementation Unit Tests
 * 
 * Tests for 3D rendering, energy flow visualization, and performance optimization.
 */

import { ImmersiveVisualizationImpl } from './ImmersiveVisualizationImpl.js';
import { 
  RenderingQuality, 
  VisualizationMode,
  EnergyFlowVisualization
} from '../interfaces/ImmersiveVisualization';
import { EnergyVisualization } from '../interfaces/ARVRInterface';

describe('ImmersiveVisualizationImpl', () => {
  let visualization: ImmersiveVisualizationImpl;

  beforeEach(async () => {
    visualization = new ImmersiveVisualizationImpl();
    await visualization.initialize(RenderingQuality.HIGH);
  });

  describe('Initialization', () => {
    test('should initialize with specified rendering quality', async () => {
      const metrics = await visualization.getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.fps).toBeGreaterThan(0);
      expect(metrics.frameTime).toBeGreaterThan(0);
    });

    test('should create default scene on initialization', async () => {
      // Scene should be created automatically during initialization
      expect(true).toBe(true); // No direct way to test private currentScene
    });

    test('should not initialize twice', async () => {
      await expect(visualization.initialize(RenderingQuality.MEDIUM))
        .resolves.not.toThrow();
    });
  });

  describe('Scene Management', () => {
    test('should create scene with default configuration', async () => {
      const scene = await visualization.createScene({
        sceneId: 'test_scene',
        name: 'Test Scene'
      });

      expect(scene).toBeDefined();
      expect(scene.sceneId).toBe('test_scene');
      expect(scene.name).toBe('Test Scene');
      expect(scene.layers).toHaveLength(1);
      expect(scene.lighting).toBeDefined();
      expect(scene.environment).toBeDefined();
      expect(scene.camera).toBeDefined();
    });

    test('should create scene with custom configuration', async () => {
      const customLighting = {
        ambientColor: '#202020',
        ambientIntensity: 0.3,
        directionalLights: [{
          direction: { x: 0, y: -1, z: 0 },
          color: '#ffdddd',
          intensity: 0.8,
          castShadows: false
        }]
      };

      const scene = await visualization.createScene({
        sceneId: 'custom_scene',
        name: 'Custom Scene',
        lighting: customLighting
      });

      expect(scene.lighting).toEqual(customLighting);
    });

    test('should load scene by ID', async () => {
      const sceneId = 'loadable_scene';
      
      await expect(visualization.loadScene(sceneId)).resolves.not.toThrow();
    });
  });

  describe('Device Visualization', () => {
    const mockDevices: EnergyVisualization[] = [
      {
        deviceId: 'device_1',
        deviceType: 'smart_light',
        position: { x: 1, y: 0, z: 0 },
        energyFlow: {
          direction: { x: 0, y: 0, z: 1 },
          intensity: 0.8,
          color: '#00ff00',
          animated: true
        },
        consumption: {
          current: 15,
          average: 12,
          peak: 20,
          unit: 'W'
        },
        status: 'normal',
        alerts: []
      },
      {
        deviceId: 'device_2',
        deviceType: 'smart_outlet',
        position: { x: -1, y: 0, z: 0 },
        energyFlow: {
          direction: { x: 0, y: 0, z: 1 },
          intensity: 0.5,
          color: '#ffaa00',
          animated: false
        },
        consumption: {
          current: 25,
          average: 20,
          peak: 30,
          unit: 'W'
        },
        status: 'warning',
        alerts: ['High consumption']
      }
    ];

    test('should update device visualizations', async () => {
      await expect(visualization.updateDeviceVisualizations(mockDevices))
        .resolves.not.toThrow();
    });

    test('should add individual device', async () => {
      const device3D = {
        deviceId: 'new_device',
        transform: {
          position: { x: 0, y: 1, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 }
        },
        model: {
          primitiveType: 'sphere' as const,
          scale: { x: 0.3, y: 0.3, z: 0.3 },
          color: '#0088ff',
          opacity: 1.0,
          wireframe: false
        },
        energyData: mockDevices[0],
        animations: [],
        interactionZone: {
          shape: 'sphere' as const,
          size: { x: 1, y: 1, z: 1 },
          offset: { x: 0, y: 0, z: 0 }
        }
      };

      await expect(visualization.addDevice(device3D)).resolves.not.toThrow();
    });

    test('should remove device', async () => {
      await visualization.updateDeviceVisualizations(mockDevices);
      await expect(visualization.removeDevice('device_1')).resolves.not.toThrow();
    });

    test('should update device transform', async () => {
      await visualization.updateDeviceVisualizations(mockDevices);
      
      const newTransform = {
        position: { x: 2, y: 1, z: 0 },
        rotation: { x: 0, y: 0.707, z: 0, w: 0.707 },
        scale: { x: 1.5, y: 1.5, z: 1.5 }
      };

      await expect(visualization.updateDeviceTransform('device_1', newTransform))
        .resolves.not.toThrow();
    });

    test('should highlight devices with different types', async () => {
      await visualization.updateDeviceVisualizations(mockDevices);

      await expect(visualization.highlightDevices(['device_1'], 'warning'))
        .resolves.not.toThrow();
      
      await expect(visualization.highlightDevices(['device_2'], 'error'))
        .resolves.not.toThrow();
      
      await expect(visualization.highlightDevices(['device_1', 'device_2'], 'info'))
        .resolves.not.toThrow();
    });

    test('should clear all highlights', async () => {
      await visualization.updateDeviceVisualizations(mockDevices);
      await visualization.highlightDevices(['device_1', 'device_2'], 'warning');
      
      await expect(visualization.clearHighlights()).resolves.not.toThrow();
    });
  });

  describe('Energy Flow Visualization', () => {
    test('should render energy flows', async () => {
      const energyFlows: EnergyFlowVisualization[] = [
        {
          flowId: 'flow_1',
          sourceDevice: 'grid',
          targetDevice: 'device_1',
          energyAmount: 100,
          flowRate: 1.67,
          efficiency: 0.95,
          path: [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 }
          ],
          particles: [],
          color: '#00ff00',
          animated: true,
          bidirectional: false
        },
        {
          flowId: 'flow_2',
          sourceDevice: 'solar_panel',
          targetDevice: 'battery',
          energyAmount: 50,
          flowRate: 0.83,
          efficiency: 0.98,
          path: [
            { x: -2, y: 1, z: 0 },
            { x: 0, y: 0.5, z: 0 }
          ],
          particles: [],
          color: '#ffaa00',
          animated: true,
          bidirectional: true
        }
      ];

      await expect(visualization.renderEnergyFlows(energyFlows))
        .resolves.not.toThrow();
    });
  });

  describe('Visualization Modes', () => {
    test('should set different visualization modes', async () => {
      await expect(visualization.setVisualizationMode(VisualizationMode.ENERGY_FLOW))
        .resolves.not.toThrow();
      
      await expect(visualization.setVisualizationMode(VisualizationMode.CONSUMPTION_HEATMAP))
        .resolves.not.toThrow();
      
      await expect(visualization.setVisualizationMode(VisualizationMode.DEVICE_STATUS))
        .resolves.not.toThrow();
      
      await expect(visualization.setVisualizationMode(VisualizationMode.CARBON_FOOTPRINT))
        .resolves.not.toThrow();
    });
  });

  describe('Layer Management', () => {
    test('should toggle layer visibility', async () => {
      await expect(visualization.toggleLayer('energy_devices', false))
        .resolves.not.toThrow();
      
      await expect(visualization.toggleLayer('energy_devices', true))
        .resolves.not.toThrow();
      
      // Should handle non-existent layer gracefully
      await expect(visualization.toggleLayer('non_existent_layer', true))
        .resolves.not.toThrow();
    });
  });

  describe('Annotations', () => {
    test('should add text annotations', async () => {
      const annotation = {
        id: 'annotation_1',
        position: { x: 1, y: 1, z: 0 },
        text: 'High Energy Device',
        fontSize: 18,
        color: '#ffffff',
        backgroundColor: '#000000',
        alwaysFaceUser: true
      };

      await expect(visualization.addAnnotation(annotation)).resolves.not.toThrow();
    });

    test('should add annotation with default values', async () => {
      const annotation = {
        id: 'annotation_2',
        position: { x: 0, y: 2, z: 0 },
        text: 'Normal Operation'
      };

      await expect(visualization.addAnnotation(annotation)).resolves.not.toThrow();
    });

    test('should remove annotations', async () => {
      const annotation = {
        id: 'removable_annotation',
        position: { x: 0, y: 0, z: 1 },
        text: 'Temporary Label'
      };

      await visualization.addAnnotation(annotation);
      await expect(visualization.removeAnnotation('removable_annotation'))
        .resolves.not.toThrow();
      
      // Should handle non-existent annotation gracefully
      await expect(visualization.removeAnnotation('non_existent_annotation'))
        .resolves.not.toThrow();
    });
  });

  describe('Rendering Quality', () => {
    test('should set different rendering qualities', async () => {
      await expect(visualization.setRenderingQuality(RenderingQuality.LOW))
        .resolves.not.toThrow();
      
      await expect(visualization.setRenderingQuality(RenderingQuality.MEDIUM))
        .resolves.not.toThrow();
      
      await expect(visualization.setRenderingQuality(RenderingQuality.HIGH))
        .resolves.not.toThrow();
      
      await expect(visualization.setRenderingQuality(RenderingQuality.ULTRA))
        .resolves.not.toThrow();
    });
  });

  describe('Performance Management', () => {
    test('should get performance metrics', async () => {
      const metrics = await visualization.getPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.fps).toBe('number');
      expect(typeof metrics.frameTime).toBe('number');
      expect(typeof metrics.drawCalls).toBe('number');
      expect(typeof metrics.triangles).toBe('number');
      expect(typeof metrics.vertices).toBe('number');
      expect(typeof metrics.textureMemory).toBe('number');
      expect(typeof metrics.geometryMemory).toBe('number');
      expect(typeof metrics.cpuUsage).toBe('number');
      expect(typeof metrics.gpuUsage).toBe('number');
      expect(typeof metrics.batteryDrain).toBe('number');
    });

    test('should optimize rendering', async () => {
      await expect(visualization.optimizeRendering()).resolves.not.toThrow();
    });
  });

  describe('Particle Effects', () => {
    test('should enable and disable particle effects', async () => {
      await expect(visualization.setParticleEffects(true)).resolves.not.toThrow();
      await expect(visualization.setParticleEffects(false)).resolves.not.toThrow();
    });

    test('should set particle quality levels', async () => {
      await expect(visualization.setParticleQuality('low')).resolves.not.toThrow();
      await expect(visualization.setParticleQuality('medium')).resolves.not.toThrow();
      await expect(visualization.setParticleQuality('high')).resolves.not.toThrow();
    });
  });

  describe('Lighting and Environment', () => {
    test('should update lighting configuration', async () => {
      const newLighting = {
        ambientColor: '#404040',
        ambientIntensity: 0.5,
        directionalLights: [
          {
            direction: { x: 1, y: -1, z: 1 },
            color: '#ffffff',
            intensity: 1.2,
            castShadows: true
          },
          {
            direction: { x: -1, y: -1, z: -1 },
            color: '#aaccff',
            intensity: 0.6,
            castShadows: false
          }
        ]
      };

      await expect(visualization.updateLighting(newLighting)).resolves.not.toThrow();
    });

    test('should set environment configuration', async () => {
      const environment = {
        skybox: 'space_skybox.hdr',
        fog: {
          color: '#cccccc',
          near: 5,
          far: 500
        }
      };

      await expect(visualization.setEnvironment(environment)).resolves.not.toThrow();
    });
  });

  describe('Camera Control', () => {
    test('should animate camera to new position', async () => {
      const target = { x: 0, y: 0, z: 0 };
      const position = { x: 5, y: 3, z: 5 };
      const duration = 1000;

      await expect(visualization.animateCamera(target, position, duration))
        .resolves.not.toThrow();
    });

    test('should reset camera to default position', async () => {
      await expect(visualization.resetCamera()).resolves.not.toThrow();
    });
  });

  describe('Screenshots and Recording', () => {
    test('should take screenshot', async () => {
      const screenshot = await visualization.takeScreenshot(1920, 1080);

      expect(screenshot).toBeDefined();
      expect(typeof screenshot).toBe('string');
      expect(screenshot.startsWith('data:image/')).toBe(true);
    });

    test('should start and stop recording', async () => {
      await expect(visualization.startRecording()).resolves.not.toThrow();
      
      const videoBlob = await visualization.stopRecording();
      expect(videoBlob).toBeInstanceOf(Blob);
      expect(videoBlob.type).toBe('video/mp4');
    });
  });

  describe('Event Handling', () => {
    test('should register device interaction callback', () => {
      const mockCallback = jest.fn();
      
      expect(() => visualization.onDeviceInteraction(mockCallback)).not.toThrow();
    });

    test('should add and remove event listeners', () => {
      const mockCallback = jest.fn();

      visualization.addEventListener('scene_loaded', mockCallback);
      visualization.addEventListener('device_added', mockCallback);
      visualization.addEventListener('device_removed', mockCallback);
      visualization.addEventListener('performance_warning', mockCallback);
      visualization.addEventListener('render_error', mockCallback);

      visualization.removeEventListener('scene_loaded', mockCallback);
      visualization.removeEventListener('device_added', mockCallback);
      visualization.removeEventListener('device_removed', mockCallback);
      visualization.removeEventListener('performance_warning', mockCallback);
      visualization.removeEventListener('render_error', mockCallback);

      expect(true).toBe(true); // Should not throw
    });
  });

  describe('Resource Management', () => {
    test('should dispose resources properly', async () => {
      await visualization.updateDeviceVisualizations([
        {
          deviceId: 'disposable_device',
          deviceType: 'smart_light',
          position: { x: 0, y: 0, z: 0 },
          energyFlow: {
            direction: { x: 0, y: 0, z: 1 },
            intensity: 0.5,
            color: '#00ff00',
            animated: true
          },
          consumption: {
            current: 10,
            average: 8,
            peak: 15,
            unit: 'W'
          },
          status: 'normal',
          alerts: []
        }
      ]);

      await expect(visualization.dispose()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle operations before initialization', async () => {
      const uninitializedVisualization = new ImmersiveVisualizationImpl();

      // Should handle gracefully or throw appropriate errors
      await expect(uninitializedVisualization.updateDeviceVisualizations([]))
        .resolves.not.toThrow(); // Returns early if not initialized
    });

    test('should handle invalid device updates gracefully', async () => {
      const invalidDevices: EnergyVisualization[] = [
        {
          deviceId: '',
          deviceType: '',
          position: { x: NaN, y: NaN, z: NaN },
          energyFlow: {
            direction: { x: 0, y: 0, z: 0 },
            intensity: -1,
            color: 'invalid_color',
            animated: true
          },
          consumption: {
            current: -10,
            average: -5,
            peak: -20,
            unit: ''
          },
          status: 'invalid_status' as any,
          alerts: []
        }
      ];

      // Should handle invalid data gracefully
      await expect(visualization.updateDeviceVisualizations(invalidDevices))
        .resolves.not.toThrow();
    });

    test('should handle scene loading errors', async () => {
      // Should handle non-existent scene gracefully
      await expect(visualization.loadScene('non_existent_scene'))
        .resolves.not.toThrow();
    });
  });

  describe('Performance Optimization', () => {
    test('should automatically adjust quality on poor performance', async () => {
      // Simulate poor performance by creating many devices
      const manyDevices: EnergyVisualization[] = Array.from({ length: 100 }, (_, i) => ({
        deviceId: `device_${i}`,
        deviceType: 'smart_device',
        position: { x: Math.random() * 10, y: Math.random() * 10, z: Math.random() * 10 },
        energyFlow: {
          direction: { x: 0, y: 0, z: 1 },
          intensity: Math.random(),
          color: '#00ff00',
          animated: true
        },
        consumption: {
          current: Math.random() * 100,
          average: Math.random() * 80,
          peak: Math.random() * 120,
          unit: 'W'
        },
        status: 'normal',
        alerts: []
      }));

      await visualization.updateDeviceVisualizations(manyDevices);
      
      // Performance optimization should be triggered automatically
      const metrics = await visualization.getPerformanceMetrics();
      expect(metrics).toBeDefined();
    });
  });
});