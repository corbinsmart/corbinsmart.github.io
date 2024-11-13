var plist = require('plist')
var {parse} = require('csv-parse')

////////////
// UTILITIES
////////////
function range(lo, hi) {
	if (hi == null) {
		hi = lo
		lo = 0
	}	
	var arr = []
	for (var i = lo; i < hi; i++) {
		arr.push(i)
	}
	return arr
}
function rangei(lo, hi) {
	return range(lo, hi+1)
}
function all(vals, pred) {
	if (pred == null)
		pred = identity
	return vals.map(pred)
		.reduce((acc,e) => acc && e, true)
}
function read(fp) {
    return fs.readFileSync(fp, {
      encoding: 'utf8'
    })
}
function write(fp, text) {
fs.writeFileSync(fp, text, {
    encoding: 'utf8'
})
}
Array.prototype.random = function () {
    return this[Math.floor((Math.random()*this.length))];
}
function repeat(e, count) {
	var arr = []
	for (var i = 0; i < count; i++) {
		arr.push(e)
	}
	return arr
}
function shuffle(array) {
    let currentIndex = array.length;
  
    // While there remain elements to shuffle...
    while (currentIndex != 0) {
  
      // Pick a remaining element...
      let randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
    return array
}
function get_weighted(arr) {
    return [].concat(...arr.map((obj) => Array(Math.ceil(obj.weight * 100)).fill(obj))); 
}
function pick_weighted(arr) {
    let weighted = get_weighted(arr);
    return weighted[Math.floor(Math.random() * weighted.length)]
}

//////////
// CONVERT
//////////
function get_difficulty(diff) {
    var difficulties = ['beginner', 'intermediate', 'advanced']
    if (difficulties.includes(diff.toLowerCase()))
        return diff
    return 'All'
}
function read_programs_f1(filename, cb) {
    var data = []
    fs.createReadStream(filename)
    .pipe(parse({ delimiter: ',', from_line: 2 }))
    .on('data', (row) => {
        data.push(row)
    })
    .on('end', () => {
        var programs = []
        var program = null
        data
        .filter(row => !all(row, e => e == ''))    
        .map(row => {
            // program header
            if (row[0] != '') {
                // add previous
                if (program != null)
                    programs.push(program)

                // create new
                program = {
                    // program properties
                    program_name:       row[0],
                    goal:               row[1],
                    emphasis:           row[2],
                    days_per_week:      row[3],
                    workout_duration:   row[4],
                    difficulty:         get_difficulty(row[6]),
                    gender:             row[7],
                    weeks_in_program:   row[8],
                    desc:               row[13],
                    
                    // program lists
                    equipment: [row[5]],
                    days: [
                        {day_name: row[9], exercises: [{muscle_group: row[10], sets: row[11], reps: row[12]}]}
                    ]
                }
            }

            // program data
            else if (row[0] == '') {
                // day header
                if (row[9] != '') {
                    program.days.push({day_name: row[9], exercises: [{muscle_group: row[10], sets: row[11], reps: row[12]}]})
                }
                
                // day & equipment data
                else {
                    // day
                    var day = program.days[program.days.length-1]
                    day.exercises.push({muscle_group: row[10], sets: row[11], reps: row[12]})

                    // equipment
                    if (row[5] != '')
                        program.equipment.push(row[5])
                }
            }

            // error
            else {
                log('ERROR. Row starts with: '+row[0])
            }
        })

        // last program
        if (program != null)
            programs.push(program)

        cb(programs)
    })
}
function read_programs_f2(filename, cb) {
    var grid = []
    var header = null

    // util
    function list_until_empty(row, colInd) {
        var list = []
        var rowInd = grid.indexOf(row)
        for (var r = rowInd; r < grid.length; r++) {
            if (grid[r][colInd] != '')
                list.push(grid[r][colInd])
            else
                break
        }
        return list
    }
    function slice_until_program_row(rowStart, colIndStart, colIndEnd, programRows) {
        var slice = []
        var rowInd = grid.indexOf(rowStart)
        for (var r = rowInd; r < grid.length; r++) {
            var row = grid[r]
            if (row != rowStart && programRows.includes(row))
                break
            slice.push(rangei(colIndStart, colIndEnd).map(c => grid[r][c]))
        }
        return slice
    }
    function split_by(rows, pred) {
        var res = [[]]
        rows.forEach(r => {
            if (!pred(r))
                res[res.length-1].push(r)
            else
                res.push([])
        })
        return res
    }

    // read and convert
    fs.createReadStream(filename)
    .pipe(parse({ delimiter: ',', from_line: 1 }))
    .on('data', (row) => {
        grid.push(row)
    })
    .on('end', () => {
        header = grid.shift()
        // log(header)

        var programRows = grid.filter(row => row[0] != '')
        var programs = programRows.map(row => {
            var p = {
                program_name: row[0],
                goal: row[1],
                emphasis: row[2],
                days_per_week: parseInt(row[3]),
                workout_duration: row[4],
                equipment: list_until_empty(row, 5),
                difficulty: row[6],
                gender: row[7],
                weeks_in_program: parseInt(row[8]),
                desc: row[13],
                weeks: [],
            }

            var allDays = slice_until_program_row(row, 9, 12, programRows)
            var days = split_by(allDays, row => all(row, cell => cell == '')).filter(e => e.length > 0)
            var week = null
            days.forEach(d => {
                if (d[0][0].substring(0,4) == 'Week') {
                    if (week != null)
                        p.weeks.push(week)
                    week = {
                        week_name: d[0][0],
                        days: []
                    }
                    d.shift()
                }
                var day = {
                    day_name: d[0][0],
                    exercises: d.map(e => {
                        return {
                          exercise: e[1],
                          sets: e[2],
                          reps: e[3],  
                        }
                    })
                }
                week.days.push(day)
            })
            return p
        })
        cb(programs)
    })
}
function programs_to_combined_csv(programs_format2) {
    var data = [['Program Name', 'Goal', 'Emphasis', 'Days/Week', 'Workout Duration', 'Equipment', 'Difficulty', 'Gender', 'Weeks in Program', 'Week/Day Name', 'Exercises', 'Sets', 'Reps', 'Description']]
    programs_format2.map(p => {
        // program header
        data.push([p.program_name,
                    p.goal,
                    p.emphasis,
                    p.days_per_week,
                    p.workout_duration,
                    (p.equipment.length > 0 ? p.equipment[0] : ''),
                    p.difficulty,
                    p.gender,
                    p.weeks_in_program,
                    p.weeks[0].week_name,
                    '',
                    '',
                    '',
                    `"${p.desc}"`,
                ])
        
        var equipment = p.equipment
        equipment.shift()

        // weeks
        for (var w = 0; w < p.weeks.length; w++) {
            var week = p.weeks[w]

            // week header
            if (w != 0) {
                data.push(['','','','','','','','','', week.week_name, '','','','',])
            }

            for (var i = 0; i < week.days.length; i++) {
                var day = week.days[i]

                for (var j = 0; j < day.exercises.length; j++) {
                    var ex = day.exercises[j]
                    data.push(['',
                        '',
                        '',
                        '',
                        '',
                        (equipment.length > 0 ? equipment.shift() : ''),
                        '',
                        '',
                        '',
                        (j == 0 ? day.day_name : ''),
                        ex.exercise,
                        ex.sets,
                        ex.reps,
                        '',
                    ])
                }
                // blank row
                data.push(repeat('', 14))
            }
        }
    })
    return data.map(row => row.join(',')).join('\n')
}
function programs_to_csvs(programs_format2) {
    var program_csvs = programs_format2.map(p => {
        var data = [['Program Name', 'Goal', 'Emphasis', 'Days/Week', 'Workout Duration', 'Equipment', 'Difficulty', 'Gender', 'Weeks in Program', 'Week/Day Name', 'Exercises', 'Sets', 'Reps', 'Description']]

        // program header
        data.push([p.program_name,
                    p.goal,
                    p.emphasis,
                    p.days_per_week,
                    p.workout_duration,
                    (p.equipment.length > 0 ? p.equipment[0] : ''),
                    p.difficulty,
                    p.gender,
                    p.weeks_in_program,
                    p.weeks[0].week_name,
                    '',
                    '',
                    '',
                    `"${p.desc}"`,
                ])
        
        var equipment = p.equipment
        equipment.shift()

        // weeks
        for (var w = 0; w < p.weeks.length; w++) {
            var week = p.weeks[w]

            // week header
            if (w != 0) {
                data.push(['','','','','','','','','', week.week_name, '','','','',])
            }

            for (var i = 0; i < week.days.length; i++) {
                var day = week.days[i]

                for (var j = 0; j < day.exercises.length; j++) {
                    var ex = day.exercises[j]
                    data.push(['',
                        '',
                        '',
                        '',
                        '',
                        (equipment.length > 0 ? equipment.shift() : ''),
                        '',
                        '',
                        '',
                        (j == 0 ? day.day_name : ''),
                        ex.exercise,
                        ex.sets,
                        ex.reps,
                        '',
                    ])
                }
                // blank row
                data.push(repeat('', 14))
            }
        }

        return data.map(row => row.join(',')).join('\n')
    })

    return program_csvs
}
function muscle_to_muscle_group(muscle) {
    var muscle_groups = {
        "abs": ["rectus abdominis"],
        "obliques": ["obliques"],
        "biceps": ["biceps", "brachialis", "biceps Brachii"],
        "forearms": ["wrist extensors", "wrist flexors"],
        "triceps": ["triceps brachii"],
        "calves": ["gastrocnemius"],
        "quads": ["quadriceps"],
        "hamstrings": ["hamstrings"],
        "glutes": ["glutes"],
        "lats": ["latissimus dorsi", "infraspinatus"],
        "traps": ["trapezius"],
        "lower back": ["lower back"],
        "chest": ["pectoralis"],
        "shoulders": ["deltoids", "rotator cuff"],
        "cardio": ["cardio"],
    }
    for (var muscle_group of Object.keys(muscle_groups)) {
        var muscles = muscle_groups[muscle_group]
        if (muscles.includes(muscle.toLowerCase()))
            return muscle_group
    }
    return 'MUSCLE GROUP NOT FOUND'
}
function difficulty_matches(program_diff, exercise_diff) {
    if (program_diff.toLowerCase() == 'all' || exercise_diff.toLowerCase() == 'all')
        return true
    return program_diff.toLowerCase() == exercise_diff.toLowerCase()
}
function get_exercises(muscle_group, program_difficulty) {
    var es = exercises.filter(e => {
        return muscle_to_muscle_group(e.muscle1).toLowerCase() == muscle_group.toLowerCase()
            && difficulty_matches(program_difficulty, e.difficulty)
    })

    // retry if no exercises found at the specified difficulty
    if (es.length == 0 && program_difficulty.toLowerCase() == ('Advanced').toLowerCase())
        return get_exercises(muscle_group, 'intermediate')
    if (es.length == 0 && program_difficulty.toLowerCase() == ('Intermediate').toLowerCase())
        return get_exercises(muscle_group, 'all')
    
    return es
}
function get_exercise_weight(e, program_difficulty) {
    var name = e.name.toLowerCase()
    var pdiff = program_difficulty.toLowerCase()
    var diffs = shuffle(['beginner', 'intermediate', 'advanced'])
    if (pdiff == 'all') {
        if (name in exercise_weights.all)
            return exercise_weights.all[name]
        for (var diff of diffs) {
            if (name in exercise_weights[diff])
                return exercise_weights[diff][name]
        }
    }
    else if (pdiff == 'advanced') {
        if (name in exercise_weights.advanced)
            return exercise_weights.advanced[name]
        if (name in exercise_weights.all)
            return exercise_weights.all[name]
            return get_exercise_weight(e, 'intermediate')
        }
    else if (pdiff == 'intermediate') {
        if (name in exercise_weights.intermediate)
            return exercise_weights.intermediate[name]
        if (name in exercise_weights.all)
            return exercise_weights.all[name]
        return get_exercise_weight(e, 'beginner')
    }
    else if (pdiff == 'beginner') {
        if (name in exercise_weights.beginner)
            return exercise_weights.beginner[name]
        if (name in exercise_weights.all)
            return exercise_weights.all[name]
        return get_exercise_weight(e, 'all')
    }

    // default
    return 1.0
}
function choose_exercise(es, program_difficulty) {
    var es_weighted = es.map(e => {
        e.weight = get_exercise_weight(e, program_difficulty)
        return e
    })
    return pick_weighted(es_weighted)
}
function convert_program(program) {
    var p2 = Object.assign({}, program)
    p2.weeks = rangei(1,parseInt(program.weeks_in_program)).map(week => {
        return {
            week_name: `Week ${week}`,
            days: program.days.map(d => {
                var d2 = Object.assign({}, d)
                d2.exercises = d.exercises.map(e => {
                    var es = get_exercises(e.muscle_group, program.difficulty)
                    var exercise = es.length > 0 ? choose_exercise(es, program.difficulty).name : 'EXERCISE NOT FOUND'
                    return {
                        muscle_group: e.muscle_group,
                        exercise: exercise,
                        sets: e.sets,
                        reps: e.reps,
                    }
                })
                return d2
            })
        }
    })
    delete p2.days
    return p2
}
function programs_to_plist(programs_format2) {
    function weeks_to_sections(program, weeks) {
        var sections = []
        var sectionNum = 1

        weeks.map((w, wi) => {
            // log(w.days.map(d => d.exercises))
            sections.push([`section${sectionNum}`, w.week_name.toLowerCase()])
            sectionNum++
            w.days.forEach((d, di) => {
                var exercises = d.exercises.map((e,ei) => {
                    var sets_and_reps = `${e.sets} set and ${e.reps} reps`
                    if (e.sets != '' && e.reps == '')
                        sets_and_reps = e.sets
                    return {
                        exerciseNum: ei+1,
                        exercise: e.exercise,
                        sets_and_reps: sets_and_reps
                    }
                })
                var dayNum = di+2
                sections.push([`section${sectionNum}`, `${d.day_name.toLowerCase()}: ${program.emphasis}`])
                exercises.forEach(e => {
                    sections.push([`section${sectionNum}exercise${e.exerciseNum}`, e.exercise])
                    sections.push([`section${sectionNum}set${e.exerciseNum}`, e.sets_and_reps])
                })
                sectionNum++
            })
        })
        return sections
    }
    var renamed = programs_format2.map(p => {
        var p2 = {
            title: p.program_name,
            goal: p.goal,
            description: p.desc,
            workoutDuration: p.workout_duration,
            totalWeeks: p.weeks_in_program,
            split: p.days_per_week,
            difficulty: p.difficulty,
            emphasis: p.emphasis,
            gender: p.gender.toLowerCase() == 'male',
            equipment: p.equipment,
        }
        var sections = weeks_to_sections(p, p.weeks)
        sections.map(s => p2[s[0]] = s[1])
        return p2
    })
    return plist.build(renamed)
}

///////
// MAIN
///////
var exercises = null
var exercise_weights = null
function main() {
    // read plist
    exercises = plist.parse(read('./in/Exercises.plist'))
    var cardio_exercises = [
        {name: 'jogging', muscle1: 'cardio', difficulty: 'all'},
        {name: 'rowing', muscle1: 'cardio', difficulty: 'all'},
        {name: 'cycling', muscle1: 'cardio', difficulty: 'all'},
        {name: 'elliptical', muscle1: 'cardio', difficulty: 'all'},
        {name: 'step machine', muscle1: 'cardio', difficulty: 'all'},
    ]
    exercises = exercises.concat(cardio_exercises)
    write('./out/exercises.json', JSON.stringify(exercises, null, 2))

    // read exercise weights
    exercise_weights = JSON.parse(read('./in/exercise_weights.json'))

    // read and convert programs (from format 1)
    read_programs_f1('./in/programs_format1.csv', (programs_f1) => {
        var programs_format2 = programs_f1.map(p => convert_program(p))
      
        // export combined CSV
        if (args.combine_csvs == true) {
            log('combine csvs')
            var programs_format2_csv = programs_to_combined_csv(programs_format2)
            write('./out/programs_format2.csv', programs_format2_csv)
        }
        
        // export separate CSVs
        else {
            log('separate csvs')
            var program_format2_csvs = programs_to_csvs(programs_format2)
            for (var i = 0; i < program_format2_csvs.length; i++) {
                var program_format2 = programs_format2[i]
                var program_format2_csv = program_format2_csvs[i]
                write(`./out/programs/${program_format2.program_name.replaceAll('/','_')}.csv`, program_format2_csv)
            }
        }
    })

    // read and convert format 2 to plist
    if (args.plist) {
        log('export plist')
        read_programs_f2('./in/programs_format2.csv', (programs_f2) => {
            var pl = programs_to_plist(programs_f2)
            write('./out/Routines.plist', pl)
        })
    }
}

// const parser = new ArgumentParser({
//     description: 'Convert workout programs from Format 1 to Format 2.'
// })
// parser.add_argument('-v', '--version', { action: 'version', version })
// parser.add_argument('-c', '--combine_csvs', { help: 'Set to false to produce one csv per workout program. Set to true to combine all workouts in one csv file. Default: true.' })
// parser.add_argument('-p', '--plist', { help: 'Set to true to convert ./in/programs_format2.csv to ./out/Routines.plist. Default: false.' })

// var args = parser.parse_args()
// args.combine_csvs = args.combine_csvs == 'false' ? false : true
// args.plist = args.plist == 'true' ? true : false
// main()