import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as tasks from './task'

export function activate(context: vscode.ExtensionContext) {

	// =========================================
	// Check and create .vscode folder
	// =========================================
	let vsCodeFolder = "";

	try {
		vsCodeFolder = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, '.vscode');

		if(!fs.existsSync(vsCodeFolder)) {
			try { fs.mkdirSync(vsCodeFolder); }
			catch {vscode.window.showErrorMessage(".vscode floder create error!"); return; }
		}
 
	} catch { vscode.window.showErrorMessage('No workspace is open! Please open a workspace or folder!'); return; }

	const bpFile = path.join(vsCodeFolder, 'myTasks.json');
	const myTasks = new tasks.Tasks(bpFile);

	context.subscriptions.push(
		// =========================================
		// Export breakpoints
		// =========================================
		vscode.commands.registerCommand('extension.exportBreakpoints', async() => {
			const picks = myTasks.getTasks().map(task => ({ label: task.task }));

			const selected = await vscode.window.showQuickPick(picks, {
				placeHolder: 'Choose a task',
			});
	
			if (selected) {
				const breakpoints = vscode.debug.breakpoints;
				const breakpointsData = breakpoints.map(bp => {
					if (bp instanceof vscode.SourceBreakpoint) {
					
						let breakpoint: tasks.Breakpoint = {
							path: bp.location.uri.fsPath,
							line: bp.location.range.start.line,
							enabled: bp.enabled,
							condition: bp.condition ? bp.condition : ''
						};

						return breakpoint;
					} 
				}).filter(Boolean);

				myTasks.exportBreakPoints(selected.label, breakpointsData) 
			}
		}),
		
		// =========================================
		// Import breakpoints
		// =========================================
		vscode.commands.registerCommand('extension.importBreakpoints', async () => {
			const picks = myTasks.getTasks().map(task => ({ label: task.task }));

			const selected = await vscode.window.showQuickPick(picks, {
				placeHolder: 'Choose a task',
			});
	
			if (selected) {
				const breakp = myTasks.importBreakPoint(selected.label);

				const breakpoints = breakp?.map((bp: any) => {
					return new vscode.SourceBreakpoint(new vscode.Location(vscode.Uri.file(bp.path), new vscode.Position(bp.line, 0)), bp.enabled);
				});
				
				if(breakpoints) {
					vscode.debug.removeBreakpoints(vscode.debug.breakpoints);
					vscode.debug.addBreakpoints(breakpoints);
					vscode.window.showInformationMessage('Breakpoints imported successfully.');
				}
			}
		}),


		vscode.commands.registerCommand('extension.exportWindows', () => {
			const editors = vscode.window.visibleTextEditors;
			const editorGroups = vscode.window.tabGroups.all;
	
			const editorLayout = editorGroups.map(group => {
				return {
					viewColumn: group.viewColumn,
					editors: group.tabs.map(tab => {
						// Feltételezve, hogy minden input rendelkezik uri-val, ami lehet nem mindig igaz
						const inputUri = (tab.input as any)?.uri?.toString();
						return {
							label: tab.label,
							resource: inputUri,
							isPreview: tab.isPreview
						};
					})
				};
			});
	
			const filePath = path.join(vscode.workspace.rootPath || '', 'windows.json');
			fs.writeFile(filePath, JSON.stringify(editorLayout, null, 2), (err) => {
				if (err) {
					vscode.window.showErrorMessage('Error exporting windows: ' + err.message);
					return;
				}
				vscode.window.showInformationMessage('Windows exported to ' + filePath);
			});
		}),

		vscode.commands.registerCommand('extension.importWindows', async () => {
			const filePath = path.join(vscode.workspace.rootPath || '', 'windows.json');
			fs.readFile(filePath, { encoding: 'utf8' }, async (error, data) => {
				if (error) {
					vscode.window.showErrorMessage(`Error importing windows: ${error.message}`);
					return;
				}

				await vscode.commands.executeCommand('workbench.action.closeAllEditors');

				try {
					const editorLayout = JSON.parse(data);
					for (const group of editorLayout) {
						for (const editor of group.editors) {
							// Megnyitja az összes fájlt, amelyek információi a JSON-ban szerepelnek
							if (editor.resource) {
								const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(editor.resource));
								await vscode.window.showTextDocument(document, { preview: editor.isPreview, viewColumn: group.viewColumn });
							}
						}
					}
					vscode.window.showInformationMessage('Windows imported successfully.');
				} catch (error: any) {
					vscode.window.showErrorMessage(`Error parsing windows JSON: ${error.message}`);
				}
			});
		}),
		
		// =========================================
		// Create new task
		// =========================================
		vscode.commands.registerCommand('extension.createNewTask', async () => {
			const userInput = await vscode.window.showInputBox({
				prompt: 'Enter the name of the task!',
				placeHolder: 'Task name'
			});
			
			if (userInput)
			myTasks.createNewTask(userInput);
		}),

		// =========================================
		// Delete task
		// =========================================
		vscode.commands.registerCommand('extension.deleteTask', async () => {
			const picks = myTasks.getTasks().map(task => ({ label: task.task }));

			const selected = await vscode.window.showQuickPick(picks, {
				placeHolder: 'Deleted task',
			});

			if (selected) {
				const result = await vscode.window.showInformationMessage(
					'Are you sure you want to delete task?', { modal: true }, 'Yes');
					
					if (result === 'Yes')
						myTasks.deleteTask(selected.label);
			}
		})
	);
}

export function deactivate() {}
