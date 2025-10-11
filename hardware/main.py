#!/usr/bin/env python3
"""
TollChain Hardware Integration
Handles RFID/QR code scanning and communication with the backend API
"""

import asyncio
import json
import logging
import os
import time
from typing import Optional, Dict, Any
import requests
import websockets
from dotenv import load_dotenv
import cv2
from pyzbar import pyzbar
import serial
import RPi.GPIO as GPIO

# Load environment variables
load_dotenv()

# Configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:3001')
WEBSOCKET_URL = os.getenv('WEBSOCKET_URL', 'ws://localhost:3001')
TOLL_BOOTH_ID = os.getenv('TOLL_BOOTH_ID', 'TB001')
LOCATION = {
    'lat': float(os.getenv('LATITUDE', '12.9716')),
    'lng': float(os.getenv('LONGITUDE', '77.5946'))
}

# Hardware configuration
RFID_SERIAL_PORT = os.getenv('RFID_SERIAL_PORT', '/dev/ttyUSB0')
RFID_BAUD_RATE = int(os.getenv('RFID_BAUD_RATE', '9600'))
QR_CAMERA_INDEX = int(os.getenv('QR_CAMERA_INDEX', '0'))

# GPIO configuration for status LEDs
LED_GREEN = 18
LED_RED = 24
LED_YELLOW = 25
BUZZER_PIN = 23

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TollChainHardware:
    def __init__(self):
        self.rfid_serial = None
        self.camera = None
        self.websocket = None
        self.is_running = False
        self.last_scan_time = {}
        self.scan_cooldown = 5  # seconds
        
        # Initialize GPIO
        self.setup_gpio()
        
        # Initialize hardware
        self.setup_rfid_reader()
        self.setup_qr_camera()
    
    def setup_gpio(self):
        """Initialize GPIO pins for LEDs and buzzer"""
        try:
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(LED_GREEN, GPIO.OUT)
            GPIO.setup(LED_RED, GPIO.OUT)
            GPIO.setup(LED_YELLOW, GPIO.OUT)
            GPIO.setup(BUZZER_PIN, GPIO.OUT)
            
            # Turn off all LEDs initially
            GPIO.output(LED_GREEN, GPIO.LOW)
            GPIO.output(LED_RED, GPIO.LOW)
            GPIO.output(LED_YELLOW, GPIO.LOW)
            GPIO.output(BUZZER_PIN, GPIO.LOW)
            
            logger.info("GPIO initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize GPIO: {e}")
    
    def setup_rfid_reader(self):
        """Initialize RFID reader via serial connection"""
        try:
            self.rfid_serial = serial.Serial(
                port=RFID_SERIAL_PORT,
                baudrate=RFID_BAUD_RATE,
                timeout=1
            )
            logger.info(f"RFID reader connected on {RFID_SERIAL_PORT}")
        except Exception as e:
            logger.error(f"Failed to connect RFID reader: {e}")
            self.rfid_serial = None
    
    def setup_qr_camera(self):
        """Initialize camera for QR code scanning"""
        try:
            self.camera = cv2.VideoCapture(QR_CAMERA_INDEX)
            if not self.camera.isOpened():
                raise Exception("Camera not accessible")
            logger.info(f"QR camera initialized on index {QR_CAMERA_INDEX}")
        except Exception as e:
            logger.error(f"Failed to initialize camera: {e}")
            self.camera = None
    
    async def connect_websocket(self):
        """Connect to backend WebSocket for real-time communication"""
        try:
            self.websocket = await websockets.connect(WEBSOCKET_URL)
            logger.info("Connected to backend WebSocket")
            
            # Send hardware status
            await self.send_hardware_status()
            
        except Exception as e:
            logger.error(f"Failed to connect to WebSocket: {e}")
            self.websocket = None
    
    async def send_hardware_status(self):
        """Send hardware status to backend"""
        if not self.websocket:
            return
        
        try:
            status = {
                'type': 'hardware_status',
                'tollBoothId': TOLL_BOOTH_ID,
                'status': 'active',
                'location': LOCATION,
                'timestamp': time.time(),
                'hardware': {
                    'rfid': self.rfid_serial is not None,
                    'camera': self.camera is not None,
                    'gpio': True
                }
            }
            
            await self.websocket.send(json.dumps(status))
            logger.info("Hardware status sent to backend")
            
        except Exception as e:
            logger.error(f"Failed to send hardware status: {e}")
    
    def read_rfid(self) -> Optional[str]:
        """Read RFID tag from serial connection"""
        if not self.rfid_serial:
            return None
        
        try:
            if self.rfid_serial.in_waiting > 0:
                data = self.rfid_serial.readline().decode('utf-8').strip()
                if data and len(data) > 0:
                    # Extract vehicle ID from RFID data
                    # Format: "VEH_1234567890" or similar
                    vehicle_id = data.replace('\r', '').replace('\n', '')
                    logger.info(f"RFID read: {vehicle_id}")
                    return vehicle_id
        except Exception as e:
            logger.error(f"Error reading RFID: {e}")
        
        return None
    
    def scan_qr_code(self) -> Optional[str]:
        """Scan QR code using camera"""
        if not self.camera:
            return None
        
        try:
            ret, frame = self.camera.read()
            if not ret:
                return None
            
            # Decode QR codes
            qr_codes = pyzbar.decode(frame)
            
            for qr_code in qr_codes:
                vehicle_id = qr_code.data.decode('utf-8')
                logger.info(f"QR code scanned: {vehicle_id}")
                return vehicle_id
                
        except Exception as e:
            logger.error(f"Error scanning QR code: {e}")
        
        return None
    
    def set_status_led(self, color: str, state: bool):
        """Set status LED"""
        try:
            if color == 'green':
                GPIO.output(LED_GREEN, GPIO.HIGH if state else GPIO.LOW)
            elif color == 'red':
                GPIO.output(LED_RED, GPIO.HIGH if state else GPIO.LOW)
            elif color == 'yellow':
                GPIO.output(LED_YELLOW, GPIO.HIGH if state else GPIO.LOW)
        except Exception as e:
            logger.error(f"Error setting LED {color}: {e}")
    
    def buzz(self, duration: float = 0.5):
        """Activate buzzer"""
        try:
            GPIO.output(BUZZER_PIN, GPIO.HIGH)
            time.sleep(duration)
            GPIO.output(BUZZER_PIN, GPIO.LOW)
        except Exception as e:
            logger.error(f"Error activating buzzer: {e}")
    
    async def process_vehicle_scan(self, vehicle_id: str):
        """Process vehicle scan and communicate with backend"""
        # Check cooldown to prevent duplicate scans
        current_time = time.time()
        if vehicle_id in self.last_scan_time:
            if current_time - self.last_scan_time[vehicle_id] < self.scan_cooldown:
                logger.info(f"Scan cooldown active for {vehicle_id}")
                return
        
        self.last_scan_time[vehicle_id] = current_time
        
        try:
            # Send scan data to backend
            scan_data = {
                'vehicleId': vehicle_id,
                'tollBoothId': TOLL_BOOTH_ID,
                'location': LOCATION,
                'timestamp': current_time,
                'scanType': 'rfid' if self.rfid_serial else 'qr'
            }
            
            # Send via HTTP API
            response = requests.post(
                f"{BACKEND_URL}/api/hardware/scan",
                json=scan_data,
                timeout=5
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('registered', False):
                    # Vehicle is registered
                    self.set_status_led('green', True)
                    self.buzz(0.3)
                    logger.info(f"Registered vehicle detected: {vehicle_id}")
                    
                    # Send WebSocket notification
                    if self.websocket:
                        await self.websocket.send(json.dumps({
                            'type': 'vehicle_detected',
                            'vehicleId': vehicle_id,
                            'registered': True,
                            'timestamp': current_time
                        }))
                else:
                    # Vehicle not registered
                    self.set_status_led('red', True)
                    self.buzz(1.0)
                    logger.warning(f"Unregistered vehicle detected: {vehicle_id}")
                    
                    # Send WebSocket alert
                    if self.websocket:
                        await self.websocket.send(json.dumps({
                            'type': 'unregistered_vehicle',
                            'vehicleId': vehicle_id,
                            'timestamp': current_time
                        }))
                
                # Turn off LED after 2 seconds
                await asyncio.sleep(2)
                self.set_status_led('green', False)
                self.set_status_led('red', False)
                
            else:
                # Backend error
                self.set_status_led('yellow', True)
                logger.error(f"Backend error: {response.status_code}")
                await asyncio.sleep(1)
                self.set_status_led('yellow', False)
                
        except Exception as e:
            logger.error(f"Error processing vehicle scan: {e}")
            self.set_status_led('red', True)
            await asyncio.sleep(1)
            self.set_status_led('red', False)
    
    async def scan_loop(self):
        """Main scanning loop"""
        logger.info("Starting vehicle scanning loop")
        
        while self.is_running:
            try:
                # Try RFID first
                vehicle_id = self.read_rfid()
                
                # If no RFID, try QR code
                if not vehicle_id and self.camera:
                    vehicle_id = self.scan_qr_code()
                
                # Process scan if vehicle detected
                if vehicle_id:
                    await self.process_vehicle_scan(vehicle_id)
                
                # Small delay to prevent excessive CPU usage
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error in scan loop: {e}")
                await asyncio.sleep(1)
    
    async def websocket_loop(self):
        """WebSocket communication loop"""
        while self.is_running:
            try:
                if not self.websocket:
                    await self.connect_websocket()
                    await asyncio.sleep(5)  # Retry after 5 seconds
                    continue
                
                # Listen for messages from backend
                message = await self.websocket.recv()
                data = json.loads(message)
                
                if data.get('type') == 'hardware_command':
                    await self.handle_hardware_command(data)
                    
            except websockets.exceptions.ConnectionClosed:
                logger.warning("WebSocket connection closed, reconnecting...")
                self.websocket = None
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"Error in WebSocket loop: {e}")
                await asyncio.sleep(1)
    
    async def handle_hardware_command(self, command: Dict[str, Any]):
        """Handle commands from backend"""
        command_type = command.get('command')
        
        if command_type == 'test_led':
            color = command.get('color', 'green')
            self.set_status_led(color, True)
            await asyncio.sleep(1)
            self.set_status_led(color, False)
            
        elif command_type == 'test_buzzer':
            duration = command.get('duration', 0.5)
            self.buzz(duration)
            
        elif command_type == 'status_request':
            await self.send_hardware_status()
    
    async def start(self):
        """Start the hardware integration"""
        logger.info("Starting TollChain hardware integration")
        self.is_running = True
        
        # Start scanning and WebSocket loops concurrently
        await asyncio.gather(
            self.scan_loop(),
            self.websocket_loop()
        )
    
    def stop(self):
        """Stop the hardware integration"""
        logger.info("Stopping TollChain hardware integration")
        self.is_running = False
        
        # Cleanup
        if self.rfid_serial:
            self.rfid_serial.close()
        
        if self.camera:
            self.camera.release()
        
        if self.websocket:
            asyncio.create_task(self.websocket.close())
        
        # Turn off all LEDs
        self.set_status_led('green', False)
        self.set_status_led('red', False)
        self.set_status_led('yellow', False)
        
        GPIO.cleanup()

async def main():
    """Main function"""
    hardware = TollChainHardware()
    
    try:
        await hardware.start()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    finally:
        hardware.stop()

if __name__ == "__main__":
    asyncio.run(main())
