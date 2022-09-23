mkdir -p ~/.vim/autoload ~/.vim/bundle \
&& curl -LSso ~/.vim/autoload/pathogen.vim https://tpo.pe/pathogen.vim \
&& curl -fLo ~/.vim/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim \
&& curl -fLo ~/.vimrc --create-dirs https://corbinsmart.com/res/vimrc
