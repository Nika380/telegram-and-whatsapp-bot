from fastapi import HTTPException, FastAPI, Path
from pyrogram import Client
from pyrogram.enums import UserStatus
import os
from fastapi.responses import JSONResponse
import uvicorn
from dotenv import load_dotenv
from pydantic import BaseModel
import traceback
from pyrogram.errors import FloodWait
import subprocess

load_dotenv()

api_ids_str=os.getenv("APP_IDS")
api_ids_arr=[str(api_id) for api_id in api_ids_str.split(",")]

api_hashs_str=os.getenv("APP_HASHS")
api_hashs_arr=[str(api_hash) for api_hash in api_hashs_str.split(",")]

http_port=os.getenv("HTTP_PORT")

numbers_list_str=os.getenv("ARRAY_OF_NUMBERS")
array_of_phone_numbers = [int(num) for num in numbers_list_str.split(",")]

user_country_list_str=os.getenv("COUNTRY_LIST")
country_list=[int(num) for num in user_country_list_str.split(",")]

api = FastAPI()

class authRequest(BaseModel):
    code: str

class clientChangeReq(BaseModel):
    client_id: int
    

class messageRequest(BaseModel):
    recipient: str
    text: str
    session_id: int

async def authorize_user(session_id: str):
    try:
        app = Client(f"./sessions/telegram-client-session-{session_id}", api_id=api_ids_arr[session_id], api_hash=api_hashs_arr[session_id], phone_number="+" + str(array_of_phone_numbers[int(session_id)]))
        await app.start()
        if not app.is_connected:
            await app.send_code('+' + str(array_of_phone_numbers[session_id]))
            await app.sign_in('+' + str(array_of_phone_numbers[session_id]), input("Enter the code: "))
        await app.stop()
        return app  
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api.post('/create-sessions')
async def create_user_sessions():
    try:
        for index, _ in enumerate(array_of_phone_numbers):
            await authorize_user(session_id=index)
        return JSONResponse("User Sessions Created", status_code=201)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api.get('/get-contacts/{client_id}/{country_code}')
async def get_contacts_list(client_id: int = Path(...), country_code: str = Path(...)):
    try:
        print("Tryng Auth...")
        client = await authorize_user(client_id)
        print("Client Authed")

        await client.start()

        contacts = await client.get_contacts()
        contacts_response = []
        for contact in contacts:
            if contact.phone_number.startswith(country_code):
                contacts_response.append({
                "firstName": contact.first_name,
                "phone": contact.phone_number,
                "id": contact.id,
                "status": contact.status.name
            })
        def custom_sort_key(contact):
            status_order = {status.name: index for index, status in enumerate(UserStatus)}
            return status_order.get(contact['status'], float('inf'))

        # Sorting Users Based On Activity
        await client.stop()
        contacts_response.sort(key=custom_sort_key)

        return JSONResponse(content=contacts_response, status_code=200)
    except Exception as e:
        traceback.print_exc()
        print(f"Error in get_contacts_list: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@api.post('/send-message')
async def send_message_func(request: messageRequest):
    try:
        client = await authorize_user(request.session_id)
        await client.start()
        await client.zsend_message(request.recipient, request.text)
        await client.stop()
        return JSONResponse("Send Successfully" + str(request), status_code=201)
    except FloodWait as floodError:
        raise HTTPException(409, detail=f"Flood Error {floodError}")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, detail=str(e)) 

# Get Request Endpoint To Stop Node.js Process of sending Messages
@api.get("/stop-process")
async def stop_process():
    try:
        # Use pgrep to find all Node.js processes and kill them
        subprocess.run(["pkill", "-f", "node"], check=True)
        print("All Node.js processes terminated.")

    except subprocess.CalledProcessError as e:
        print(f"Error terminating Node.js processes: {e}")

if __name__ == "__main__":
    uvicorn.run(api, host="127.0.0.1", port=int(http_port))