# Kevin Bacon Rools 🥓

A collaborative supergraph builder centered around the ["Six Degrees of Kevin Bacon"](https://en.wikipedia.org/wiki/Six_Degrees_of_Kevin_Bacon) theory. Built on [Rool](https://rool.app).

## 🚀 How to Use

1. **Login**: Authenticate with your Rool account.
2. **Build the Graph**: Drag and drop or upload a photo of a famous actor.
3. **Automated Discovery**: 
   - The app uses AI to identify everyone in the photo.
   - It automatically checks if they exist in the shared supergraph.
   - It creates connections (links) between everyone found in the photo.
   - **Unidentified people** are simply omitted — no Person object or placeholder is created for faces the AI cannot recognize.
4. **Explore Connections**: Watch the graph evolve in real-time as you and others contribute new photos and discover how everyone is eventually linked back to Kevin Bacon.

## 🛠 Tech Stack

- **Frontend**: Svelte + Vite + TailwindCSS
- **Visualization**: D3.js (Force-directed graph)
- **Backend**: Rool (Shared space, object storage, and AI processing)

## 🌐 Live App
Check it out at: **[https://kevin-bacon-rools.rool.app](https://kevin-bacon-rools.rool.app)**
