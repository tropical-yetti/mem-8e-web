# Getting started

MEM-8E Web shows what happens **inside** the memory when the CPU reads or writes. The memory has 256 locations of 8 bits, addresses `00` to `FF`, like the [CPU-8E](https://tropical-yetti.github.io/cpu-8e-web/) memory. This page takes about five minutes.

## 1. Pick an address {#endereco}

In the left panel, the **MAR** holds the address the CPU wants. Type `3A` in the MAR field, or click the bits below it.

Notice two things:

- the bits are split in two groups of four: **row** (A7–A4) and **column** (A3–A0). In `3A`, the row is `3` and the column is `A`;
- in the grid on the right, location `3A` (row 3, column A) gets an outline.

You can also click a location in the grid: its address goes to the MAR.

## 2. Enable the memory and read {#ler-a-mao}

Turn **CS** (chip select) on. The decoders respond: row 3 and column A light up in the grid, and below it the **column selector** shows the chosen data. The data bus (**DB**) is still floating, dashed: the output buffers are off.

Now turn **RD** (read) on. The buffers turn on, and the data appears on the DB, with the arrow going from the memory to the CPU.

## 3. A read, phase by phase {#transacao}

Turn CS and RD off and use **Read address 3A**. The read happens in phases, one per click on **Next phase**, and the text explains each one. In the **MDR latches** phase, the MDR gets the data.

With the default timings there is a **Wait state** phase: the memory is slower than the CPU, and the CPU waits. The [timing page](#/documentacao/tempo) explains why.

## 4. Write a value {#escrever}

Type `C7` in the **MDR** and use **Write C7 to address 3A**. Step through the phases and watch cell `3A` change when **WR** turns on.

## 5. Cause an error {#erro}

Turn on **MDR → DB**, **CS** and **RD** together: the CPU and the memory both drive the DB. The bits where they disagree turn **X**, in red: a **contention**. The [Four levels](#/documentacao/niveis) page explains what that means.

## 6. Keep and share the memory {#arquivo}

Below the grid are the **Open file**, **Save file**, **Paste text** and **Copy text** buttons. The memory contents become plain text that you can open in any editor, send by e-mail or put in a lesson plan:

```text
# comments start with # or ;
00: 3A 10 C4 FF
10: 2A XX 00
F0: 1X0X0001
```

- Each line may start with a hex **address** and a colon. Without it, the bytes continue where the previous line left off; the first one goes to `00`.
- Each **byte** has 2 hex digits. `XX` is an undefined cell, and 8 digits `0`, `1` or `X` (from bit 7 to bit 0) describe a cell with only some bits undefined.
- **Opening replaces the whole memory:** locations the text does not list become `00`.
- Text with an error **changes nothing**. The message gives the line and column of the problem: an invalid byte, an address past `FF`, or a location that appears twice.
- **Saving** writes all 256 locations as 16 lines of 16 bytes. Opening that file again gives exactly the same memory, X cells included.

CPU-8E `.bin` files do not open here: they are programs, and MEM-8E only shows the memory, without running anything.

## Where to go next

- [How the memory works](#/documentacao/memoria): every block, from the address to the data.
- [In logic gates](#/documentacao/portas): the same circuit, gate by gate.
- [Lesson plan](#/documentacao/roteiro): exercises to do in the simulator.

The **Show the guide** button, on the simulator page, shows the introduction balloons again. Each section also has a **?** button that explains just that part, and hovering (or focusing) an abbreviation shows its full name.

[//]: # 'SPDX-License-Identifier: GPL-3.0-or-later'
