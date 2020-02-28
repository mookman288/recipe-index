//https://gist.github.com/rickycheers/4541395
String.prototype.ucwords = function() {
	return this.toLowerCase().replace(
		/(^([a-zA-Z\p{M}]))|([ -][a-zA-Z\p{M}])/g,
		(s) => {
			return s.toUpperCase();
		}
	);
};

const expiry = 86400000;
const params = new URLSearchParams(window.location.search);

let search, cache, recipes;

const handleError = (error) => {
	document.getElementById('notices').innerHTML = '';
	document.getElementById('notices').insertAdjacentHTML('beforeend', `
		<p class="label label-error">` + error + `</p>
	`);
};

const handleInfo = (info) => {
	document.getElementById('notices').innerHTML = '';
	document.getElementById('notices').insertAdjacentHTML('beforeend', `
		<p class="label label-secondary">` + info + `</p>
	`);
};

const getElementHtml = (recipe, compact, hideButton) => {
	let author = '', description = '', ingredients = '', steps = '', tags = '';

	if (typeof recipe.author !== 'undefined') {
		author = '<p>Author: ';

		if (typeof recipe.authorLink !== 'undefined') {
			author += '<a href="' + recipe.authorLink + '" target="_blank">' + recipe.author + '</a>';
		} else {
			author = recipe.author;
		}

		author += '</p>';
	}

	if (typeof recipe.description !== 'undefined') {
		recipe.description.split(/\r?\n/).forEach((line) => {
			description = description + '<p>' + line + '</p>'
		});
	}

	if (typeof recipe.ingredients !== 'undefined' && !compact) {
		ingredients = `
			<div class="panel-body">
				<h3>Ingredients</h3>
				<ul>`;
		recipe.ingredients.forEach((line) => {
			if (typeof line.amount !== 'undefined') {
				line.amount = line.amount.toString()
					.replace('0.', '.')
					.replace('.66', '&frac23;')
					.replace('.67', '&frac23;')
					.replace('.5', '&frac12;')
					.replace('.33', '&frac13;')
					.replace('.34', '&frac13;')
					.replace('.25', '&frac14;')
					.replace('.125', '&frac18;')
					.replace('.0625', '1&frasl;16')
					.replace('.', '0.');
			}

			ingredients += '<li>'
			+ ((typeof line.amount !== 'undefined') ? line.amount + ' ' : '')
			+ ((typeof line.measurement !== 'undefined') ? line.measurement.ucwords() + ' ' : '')
			+ ((typeof line.ingredient !== 'undefined') ? line.ingredient.ucwords() : '')
			+ ((typeof line.addendum !== 'undefined') ? ', ' + line.addendum.ucwords() : '')
			+ '</li>';
		});
		ingredients += `
				</ul>
			</div>`;
	}

	if (typeof recipe.recipe !== 'undefined' && !compact) {
		steps = `
			<div class="panel-body">
				<h3>Recipe</h3>
				<ol>`;
		recipe.recipe.forEach((line) => {
			if (typeof recipe.ingredients !== 'undefined') {
				recipe.ingredients.forEach((ingredient, key) => {
					if (typeof ingredient.ingredient !== 'undefined') {
						line = line.replace('&$' + key, ingredient.ingredient.ucwords());
					}
				});
			}

			steps += '<li>' + line + '</li>';
		});

		steps += `
				</ol>
			</div>`;
	}

	if (typeof recipe.tags !== 'undefined') {
		tags = '<p>Tags: ';

		recipe.tags.forEach((tag) => {
			tags += '<a href="?s=' + encodeURIComponent(tag) + '" class="btn btn-sm">' + tag + '</a> ';
		});

		tags += '</p>';
	}

	const button = (!hideButton) ? '<a href="?r=' + recipe.slug + '" class="btn btn-primary">Read Recipe</a>' : '';

	return `
		<div class="panel">
			<div class="panel-header">
				<h2>` + recipe.name.ucwords() + `</h2>
				` + author + `
			</div>
			<div class="panel-body">
				` + description + `
				` + ingredients + `
				` + steps + `
			</div>
			<div class="panel-footer">
				` + tags + `
				` + button + `
			</div>
		</div>
	`;
};

const parseRecipe = (recipe, slug, store, update) => {
	if (store) {
		if (typeof recipe.name !== 'undefined') {
			recipe.slug = slug;

			recipes[slug] = recipe;

			const recipesObject = {
				data: recipes,
				timestamp: new Date()
			};

			localStorage.setItem('recipes', JSON.stringify(recipesObject));
		}
	}

	if (update) {
		document.getElementById('content').insertAdjacentHTML('beforeend', getElementHtml(recipe, true));

		processSearch();
	}
}

const processSearch = () => {
	if (search) return;

	search = true;
	let currentRecipe = params.get('r');
	let searchTerm = params.get('s');

	if (currentRecipe && typeof recipes !== 'undefined') {
		if (recipes[currentRecipe] !== 'undefined') {
			document.getElementById('content').innerHTML = getElementHtml(recipes[currentRecipe], false, true);
		} else {
			handleError('No recipe was found referencing that slug.');
		}
	} else if (searchTerm) {
		let results = {};

		document.getElementById('s').value = searchTerm;

		document.getElementById('content').innerHTML = '';

		searchTerm.split(' ').forEach((term) => {
			for (const slug in recipes) {
				const regex = new RegExp(term, 'g');

				if (typeof recipes[slug].name !== 'undefined') {
					if (recipes[slug].name.match(regex)) {
						if (typeof results[slug] === 'undefined') {
							results[slug] = recipes[slug];
						}
					}
				}

				if (typeof recipes[slug].description !== 'undefined') {
					if (recipes[slug].description.match(regex)) {
						if (typeof results[slug] === 'undefined') {
							results[slug] = recipes[slug];
						}
					}
				}

				if (typeof recipes[slug].tags !== 'undefined') {
					recipes[slug].tags.forEach((tag) => {
						if (tag.match(regex)) {
							if (typeof results[slug] === 'undefined') {
								results[slug] = recipes[slug];
							}
						}
					});
				}
			}
		});

		if (Object.keys(results).length > 0) {
			handleInfo("Searching for: " + searchTerm);

			for (const slug in results) {
				parseRecipe(
					recipes[slug],
					slug,
					false,
					Object.is(Object.keys(recipes)[Object.keys(recipes).length - 1], slug)
				);
			}
		} else {
			handleError('No recipes were found using those search terms.')
		}

	} else {
		document.querySelector('.nav-home').className += ' active';
	}
}

const getRecipes = () => {
	if (typeof recipes === 'undefined' || Object.keys(recipes).length < 1
		|| Math.abs(new Date() - new Date(cache.timestamp) > expiry)) {


		fetch('recipes.json')
			.then((response) => {
				if (response.status !== 200) {
					handleError('There was an error connecting to the recipe index.');
				}

				return response.json();
			})
			.then((data) => {
				data.forEach((file, key, collection) => {
					fetch('recipes/' + file + '.json')
						.then((response) => {
							if (response.status !== 200) {
								handleError('There was an error retrieving recipe: ' + file + '.');
							}

							return response.json();
						})
						.then((recipe) => {
							parseRecipe(
								recipe,
								file,
								true,
								Object.is(data.length - 1, key)
							);
						})
						.catch((error) => {
							console.error(error);

							handleError('There was an error processing the recipe file.');
						});
				})
			})
			.catch((error) => {
				console.error(error);

				handleError('There was an error processing the recipe index.');
			});
	} else {
		for (const slug in recipes) {
			parseRecipe(
				recipes[slug],
				slug,
				false,
				Object.is(Object.keys(recipes)[Object.keys(recipes).length - 1], slug)
			);
		}
	}
};

const app = (() => {
	search = false;
	cache = (!params.get('c')) ? JSON.parse(localStorage.getItem('recipes')) ?? {} : {};
	recipes = (typeof cache.data !== 'undefined') ? cache.data : {};

	//Clear the cache to fetch new recipes.
	if (params.get('c')) handleInfo('Cache cleared: fetching new recipes.');

	document.querySelector('html').setAttribute('lang', 'en');

	getRecipes();
})();