function potpack(boxes) {
    // calculate total box area and maximum box width
    let area = 0
    let maxWidth = 0

    for (const box of boxes) {
        area += box.w * box.h
        maxWidth = Math.max(maxWidth, box.w)
    }

    // sort the boxes for insertion by height, descending
    boxes.sort((a, b) => b.h - a.h)

    // aim for a squarish resulting container,
    // slightly adjusted for sub-100% space utilization
    const startWidth = Math.max(Math.ceil(Math.sqrt(area / 0.95)), maxWidth)

    // start with a single empty space, unbounded at the bottom
    const spaces = [{ x: 0, y: 0, w: startWidth, h: Infinity }]

    let width = 0
    let height = 0

    for (const box of boxes) {
        // look through spaces backwards so that we check smaller spaces first
        for (let i = spaces.length - 1; i >= 0; i--) {
            const space = spaces[i]

            // look for empty spaces that can accommodate the current box
            if (box.w > space.w || box.h > space.h)
                continue

            // found the space; add the box to its top-left corner
            // ┌───────┬───────┐
            // │  box  │       │
            // ├───────┘       │
            // │         space │
            // └───────────────┘
            box.x = space.x
            box.y = space.y

            height = Math.max(height, box.y + box.h)
            width = Math.max(width, box.x + box.w)

            if (box.w === space.w && box.h === space.h) {
                // space matches the box exactly; remove it
                const last = spaces.pop()
                if (i < spaces.length)
                    spaces[i] = last
            }
            else if (box.h === space.h) {
                // space matches the box height; update it accordingly
                // ┌───────┬───────────────┐
                // │  box  │ updated space │
                // └───────┴───────────────┘
                space.x += box.w
                space.w -= box.w
            }
            else if (box.w === space.w) {
                // space matches the box width; update it accordingly
                // ┌───────────────┐
                // │      box      │
                // ├───────────────┤
                // │ updated space │
                // └───────────────┘
                space.y += box.h
                space.h -= box.h
            }
            else {
                // otherwise the box splits the space into two spaces
                // ┌───────┬───────────┐
                // │  box  │ new space │
                // ├───────┴───────────┤
                // │ updated space     │
                // └───────────────────┘
                spaces.push({
                    x: space.x + box.w,
                    y: space.y,
                    w: space.w - box.w,
                    h: box.h
                })
                space.y += box.h
                space.h -= box.h
            }
            break
        }
    }

    return {
        w: width, // container width
        h: height, // container height
        fill: (area / (width * height)) || 0 // space utilization
    }
}

async function main() {
    const DRAW_TEXT = Math.random() > .5

    const boxes = []
    const sizes = [8, 16, 32, 64] // [8,16,32,64]
    const N = 256 // 1024 // 4096 // 256

    for (let i = 0; i < N; i++) {
        add_a_box:
        {
            let w = sizes[Math.random() * sizes.length | 0]
            let h = Math.random() > 0.75 ? 1 << (3 + Math.random() * 4 | 0) : w // square the 75% of the times.
            let c = `hsl(${Math.random() * 360 | 0}, 45%, 75%)`
            let box = { w, h, i, c }
            boxes.push(box)
        }

        const t0 = performance.now()
        const result = potpack(boxes)
        const t1 = performance.now()
        const { w, h, fill } = result

        const aspect = w / h
        canvas.width = w * dpr
        canvas.height = h * dpr
        canvas.style.cssText = `
		width: 256px;
		height: ${256 / aspect}px;
		width: ${w}px;
		height: ${h}px;
		outline: 1px solid black;
		`

        ctx.save()
        ctx.scale(dpr, dpr)
        ctx.lineWidth = 0.5
        ctx.strokeStyle = 'rgba(127,127,127,.5)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = '8px ui-monospace'
        for (const box of boxes) {
            ctx.save()
            ctx.translate(box.x, box.y)
            ctx.fillStyle = box.c
            ctx.fillRect(0, 0, box.w, box.h)
            ctx.beginPath()
            ctx.moveTo(0, 0)
            ctx.lineTo(box.w, 0)
            ctx.lineTo(box.w, box.h)
            ctx.lineTo(0, box.h)
            ctx.closePath()
            ctx.moveTo(0, 0)
            ctx.lineTo(box.w, box.h)
            ctx.moveTo(0, box.h)
            ctx.lineTo(box.w, 0)
            ctx.stroke()

            if (DRAW_TEXT) {
                ctx.fillStyle = 'black'
                ctx.font = `${Math.min(box.w, box.h) * 0.5}px ui-monospace`
                ctx.fillText(box.i.toString(16).padStart(2, '0').toUpperCase(), box.w / 2, box.h / 2)
            }

            ctx.restore()
        }
        ctx.restore()
        const t2 = performance.now()


        debug.textContent = JSON.stringify
            (
                {
                    ...result,
                    i,
                    N,
                    progress: `${(((i + 1) / N) * 100).toFixed(1)}%`,
                    timings:
                    {
                        potpack: (t1 - t0).toFixed(3),
                        draw: (t2 - t1).toFixed(3),
                        total: (t2 - t0).toFixed(3)
                    }
                },
                null,
                3
            )

        await new Promise(r => requestAnimationFrame(() => { r() }))
    }
}

let dpr = window.devicePixelRatio
const ctx = canvas.getContext('2d')


main().then(() => {
    console.log('ok')
}).catch(error => {
    console.error(error.name, error.message)
})

