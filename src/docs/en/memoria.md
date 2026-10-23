# How the memory works

The CPU never touches the memory directly. It puts an address in a register, turns some control signals on and waits for the data to arrive (or hands it over) through another register. This page follows that path, from the address to the data.

## The two registers: MAR and MDR {#mar}

- The **MAR** (_Memory Address Register_) holds the **address** of the location to read or write. It is always connected to the address bus.
- The **MDR** (_Memory Data Register_) holds the **data**: what came from the memory in a read, or what goes to it in a write. (Note: some texts also call the MDR the **MBR**, or _Memory Buffer Register_; it is exactly the same register.)

The MAR and the MDR work together to move data words to and from the memory, while the PC (_Program Counter_) manages the flow of control, pointing to the program instructions.

## Three groups of wires {#barramentos}

| Group                | Wires      | Direction    | Who drives                               |
| -------------------- | ---------- | ------------ | ---------------------------------------- |
| Address bus (**AB**) | A7–A0      | CPU → memory | always the MAR                           |
| Data bus (**DB**)    | D7–D0      | both ways    | the CPU in a write, the memory in a read |
| Control              | CS, RD, WR | CPU → memory | the CPU control unit                     |

The DB is shared: sometimes the CPU drives it, sometimes the memory. When nobody drives it, it **floats** (high impedance, Z). See [The four levels](#/documentacao/niveis).

## Control signals {#controle}

- **CS** (_chip select_) enables the memory. Without it, no row or column is selected and nothing happens, even with RD or WR on.
- **RD** (_read_) turns the output buffers on: the selected data goes to the DB.
- **WR** (_write_) enables writing: the selected cell copies what is on the DB.

The CPU-8E hides these signals. Here you can set them by hand, even in wrong combinations, to see what happens.

## RD and WR at the same time {#rd-wr}

In the simulator, turning RD and WR on together gives neither one priority: the output buffers put the cell on the DB, and the same cell copies the DB.

- If only the memory drives the DB, the cell writes its own value back, and nothing changes on the screen.
- If the CPU also drives the DB (MDR → DB), there is contention: where the MDR and the cell disagree, the DB becomes X, and the cell stores the X.

The model works this way on purpose, so that the conflict shows. **In real memories**, it is different:

- in many asynchronous SRAMs, an active WR turns off the output buffers, and the chip only writes;
- the CPU’s memory controller never turns RD and WR on at the same time, and that is the right way to avoid the conflict.

The “What if RD and WR are turned on together?” experiment, under the **“What if…?” experiments** button in the simulator, shows both cases step by step.

## The array: row × column {#matriz}

The 256 locations are not in a single line. They form an **array of 16 rows by 16 columns**, and the address is split in two:

- **A7–A4** (the first hex digit) select the **row**;
- **A3–A0** (the second digit) select the **column**.

Address `3A` is in row `3`, column `A`. That is why the simulator grid has 16 rows and 16 columns: it is the array itself.

Why an array? A direct 8 → 256 decoder would need 256 eight-input AND gates and 256 wires coming out of it. With the array, there are two 4 → 16 decoders: 32 small gates and 32 wires.

## Decoders {#decodificadores}

A **4 → 16 decoder** takes 4 bits and turns on **exactly one** of its 16 outputs: the one whose number equals the input. Input `0011` turns on output 3, and no other.

Both decoders work only with **CS** on (the EN input). The row decoder turns on one **word line**, and the column decoder picks the column in the selector. The [In logic gates](#/documentacao/portas#decodificador) page shows a decoder inside.

## Bit lines and selector {#linhas-de-bit}

When a word line turns on, **the whole row is read**: its 16 bytes go down the **bit lines**, one per column. In the "Inside" view, below the grid, you see these 16 bytes.

The **column selector** (a 16 → 1 multiplexer) uses the column decoder output to pick one of these 16 bytes. Only that byte goes on.

Reading the whole row looks wasteful, but that is how real memories work, and it is the basis of synchronous memories and DDR: once a row is "open", reading other columns of the same row is fast.

## Output buffers (tri-state) {#buffers}

Between the selector and the DB are the **tri-state buffers**. They have two modes:

- **on** (CS · RD = 1): they copy the data to the DB;
- **off**: they disconnect from the wire, which goes to **Z**.

That is what lets the CPU and the memory share the same DB: whoever is not talking disconnects.

## Writing {#escrita}

In a write, the path is reversed. The CPU turns **its** buffers on and puts the MDR on the DB. With **CS** and **WR** on, only the cell where the selected row and column meet copies the DB.

Each bit of the cell is a **D latch**. While writing is enabled, it follows its input; when WR turns off, it keeps the last value. If the DB is floating during the write, the cell stores an undefined value (X).

## Read and write, in order {#ordem}

| Read                              | Write                              |
| --------------------------------- | ---------------------------------- |
| 1. MAR → AB                       | 1. MAR → AB                        |
| 2. CS on: row and column selected | 2. The CPU puts the MDR on the DB  |
| 3. RD on: the data goes to the DB | 3. CS on: row and column selected  |
| 4. The MDR copies the DB          | 4. WR on: the cell copies the DB   |
| 5. RD and CS off: DB floating     | 5. WR off: the value is stored     |
|                                   | 6. CS off, the CPU releases the DB |

The [Read, write and timing](#/documentacao/tempo) page shows how long each phase takes.

[//]: # 'SPDX-License-Identifier: GPL-3.0-or-later'
